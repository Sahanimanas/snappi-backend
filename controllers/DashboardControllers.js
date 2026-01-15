const Campaign = require('../models/Campaign');
const Influencer = require('../models/Influencer');
const CampaignInfluencer = require('../models/CampaignInfluencer');
const { asyncHandler } = require('../utils/helpers');

// @desc    Get dashboard overview (main dashboard page)
// @route   GET /api/dashboard
// @access  Private
exports.getDashboardOverview = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // ============================================
  // 1. CAMPAIGN STATS
  // ============================================
  
  // Get all campaigns for this user
  const allCampaigns = await Campaign.find({ createdBy: userId });
  
  // Active campaigns count
  const activeCampaigns = await Campaign.countDocuments({ 
    createdBy: userId, 
    status: 'active' 
  });

  // Calculate total budget and spent
  let totalBudget = 0;
  let totalSpent = 0;
  let totalReach = 0;
  let totalEngagement = 0;
  let totalConversions = 0;

  allCampaigns.forEach(campaign => {
    if (campaign.budget) {
      totalBudget += campaign.budget.total || 0;
      totalSpent += campaign.budget.spent || 0;
    }
    if (campaign.performance) {
      totalReach += campaign.performance.totalReach || 0;
      totalEngagement += campaign.performance.totalEngagement || 0;
      totalConversions += campaign.performance.totalConversions || 0;
    }
  });

  // Calculate ROI: ((Revenue - Cost) / Cost) * 100
  // Assuming each conversion is worth $100 (this can be configured)
  const conversionValue = 100;
  const estimatedRevenue = totalConversions * conversionValue;
  const roi = totalSpent > 0 ? ((estimatedRevenue - totalSpent) / totalSpent) * 100 : 0;

  // ============================================
  // 2. MONTH OVER MONTH COMPARISON
  // ============================================
  
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // This month's campaigns
  const thisMonthCampaigns = await Campaign.find({
    createdBy: userId,
    createdAt: { $gte: startOfThisMonth }
  });

  // Last month's campaigns
  const lastMonthCampaigns = await Campaign.find({
    createdBy: userId,
    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
  });

  // Calculate month-over-month changes
  const thisMonthActive = thisMonthCampaigns.filter(c => c.status === 'active').length;
  const lastMonthActive = lastMonthCampaigns.filter(c => c.status === 'active').length;
  const activeCampaignsChange = thisMonthActive - lastMonthActive;

  let thisMonthReach = 0;
  let lastMonthReach = 0;
  let thisMonthSpent = 0;
  let lastMonthSpent = 0;

  thisMonthCampaigns.forEach(c => {
    thisMonthReach += c.performance?.totalReach || 0;
    thisMonthSpent += c.budget?.spent || 0;
  });

  lastMonthCampaigns.forEach(c => {
    lastMonthReach += c.performance?.totalReach || 0;
    lastMonthSpent += c.budget?.spent || 0;
  });

  const reachChangePercent = lastMonthReach > 0 
    ? Math.round(((thisMonthReach - lastMonthReach) / lastMonthReach) * 100) 
    : (thisMonthReach > 0 ? 100 : 0);

  const spentChangePercent = lastMonthSpent > 0 
    ? Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100) 
    : (thisMonthSpent > 0 ? 100 : 0);

  // ============================================
  // 3. RECENT CAMPAIGNS (last 5)
  // ============================================
  
  const recentCampaigns = await Campaign.find({ createdBy: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Get influencer counts for each campaign
  const recentCampaignsWithInfluencers = await Promise.all(
    recentCampaigns.map(async (campaign) => {
      const influencerCount = await CampaignInfluencer.countDocuments({ 
        campaign: campaign._id 
      });
      return {
        _id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        budget: campaign.budget?.total || 0,
        spent: campaign.budget?.spent || 0,
        influencerCount,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        createdAt: campaign.createdAt
      };
    })
  );

  // ============================================
  // 4. TOP PERFORMING INFLUENCERS (by engagement rate)
  // ============================================
  
  const topInfluencers = await Influencer.find({})
    .sort({ engagement: -1 })  // Sort by engagement rate descending
    .limit(5)
    .select('name username profileImage followers engagement platform niche verified')
    .lean();

  // Format top influencers with match score
  const formattedTopInfluencers = topInfluencers.map(influencer => {
    // Calculate match score based on engagement and followers
    let matchScore = 0;
    matchScore += Math.min((influencer.engagement || 0) * 8, 60); // Up to 60 points for engagement
    if (influencer.followers >= 1000000) matchScore += 25;
    else if (influencer.followers >= 500000) matchScore += 20;
    else if (influencer.followers >= 100000) matchScore += 15;
    else if (influencer.followers >= 10000) matchScore += 10;
    else matchScore += 5;
    if (influencer.verified) matchScore += 15;

    return {
      _id: influencer._id,
      name: influencer.name,
      username: influencer.username,
      profileImage: influencer.profileImage,
      followers: influencer.followers,
      engagement: influencer.engagement,
      platform: influencer.platform,
      niche: influencer.niche,
      verified: influencer.verified,
      matchScore: Math.min(Math.round(matchScore), 100)
    };
  });

  // ============================================
  // 5. RESPONSE
  // ============================================
  
  res.status(200).json({
    success: true,
    data: {
      stats: {
        activeCampaigns: {
          value: activeCampaigns,
          change: activeCampaignsChange,
          changeLabel: 'from last month'
        },
        totalReach: {
          value: totalReach,
          formatted: formatNumber(totalReach),
          changePercent: reachChangePercent,
          changeLabel: 'from last month'
        },
        campaignROI: {
          value: Math.round(roi),
          formatted: `${Math.round(roi)}%`,
          changePercent: 12, // Placeholder - calculate actual change if needed
          changeLabel: 'from last month'
        },
        totalSpend: {
          value: totalSpent,
          formatted: formatCurrency(totalSpent),
          changePercent: spentChangePercent,
          changeLabel: 'from last month'
        }
      },
      recentCampaigns: recentCampaignsWithInfluencers,
      topPerformingInfluencers: formattedTopInfluencers,
      summary: {
        totalCampaigns: allCampaigns.length,
        totalBudget: totalBudget,
        totalInfluencersWorkedWith: await CampaignInfluencer.countDocuments({
          campaign: { $in: allCampaigns.map(c => c._id) }
        })
      }
    }
  });
});

// @desc    Get dashboard stats only (lightweight endpoint)
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const [activeCampaigns, allCampaigns] = await Promise.all([
    Campaign.countDocuments({ createdBy: userId, status: 'active' }),
    Campaign.find({ createdBy: userId }).select('budget performance').lean()
  ]);

  let totalSpent = 0;
  let totalReach = 0;
  let totalConversions = 0;

  allCampaigns.forEach(campaign => {
    totalSpent += campaign.budget?.spent || 0;
    totalReach += campaign.performance?.totalReach || 0;
    totalConversions += campaign.performance?.totalConversions || 0;
  });

  // Calculate ROI
  const conversionValue = 100;
  const estimatedRevenue = totalConversions * conversionValue;
  const roi = totalSpent > 0 ? ((estimatedRevenue - totalSpent) / totalSpent) * 100 : 0;

  res.status(200).json({
    success: true,
    data: {
      activeCampaigns,
      totalReach: formatNumber(totalReach),
      totalReachRaw: totalReach,
      campaignROI: `${Math.round(roi)}%`,
      campaignROIRaw: Math.round(roi),
      totalSpend: formatCurrency(totalSpent),
      totalSpendRaw: totalSpent
    }
  });
});

// @desc    Get recent campaigns for dashboard
// @route   GET /api/dashboard/campaigns/recent
// @access  Private
exports.getRecentCampaigns = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const limit = parseInt(req.query.limit) || 5;

  const recentCampaigns = await Campaign.find({ createdBy: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const campaignsWithDetails = await Promise.all(
    recentCampaigns.map(async (campaign) => {
      const influencerCount = await CampaignInfluencer.countDocuments({ 
        campaign: campaign._id 
      });
      
      return {
        _id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        budget: campaign.budget?.total || 0,
        spent: campaign.budget?.spent || 0,
        remaining: campaign.budget?.remaining || 0,
        influencerCount,
        reach: campaign.performance?.totalReach || 0,
        engagement: campaign.performance?.totalEngagement || 0,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        createdAt: campaign.createdAt
      };
    })
  );

  res.status(200).json({
    success: true,
    count: campaignsWithDetails.length,
    data: campaignsWithDetails
  });
});

// @desc    Get top performing influencers (sorted by engagement rate)
// @route   GET /api/dashboard/influencers/top
// @access  Private
exports.getTopPerformingInfluencers = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 5;
  const sortBy = req.query.sortBy || 'engagement'; // engagement, followers, matchScore

  // Determine sort field
  let sortField = {};
  switch (sortBy) {
    case 'followers':
      sortField = { followers: -1 };
      break;
    case 'matchScore':
      sortField = { rating: -1, engagement: -1 };
      break;
    case 'engagement':
    default:
      sortField = { engagement: -1 };
      break;
  }

  const topInfluencers = await Influencer.find({})
    .sort(sortField)
    .limit(limit)
    .select('name username profileImage followers engagement platform niche verified rating totalCollaborations')
    .lean();

  // Calculate match scores
  const influencersWithScores = topInfluencers.map(influencer => {
    let matchScore = 0;
    
    // Engagement score (0-60 points) - heavily weighted
    matchScore += Math.min((influencer.engagement || 0) * 8, 60);
    
    // Follower tier score (0-25 points)
    const followers = influencer.followers || 0;
    if (followers >= 1000000) matchScore += 25;
    else if (followers >= 500000) matchScore += 20;
    else if (followers >= 100000) matchScore += 15;
    else if (followers >= 10000) matchScore += 10;
    else matchScore += 5;
    
    // Verified bonus (15 points)
    if (influencer.verified) matchScore += 15;

    return {
      _id: influencer._id,
      name: influencer.name,
      username: influencer.username,
      profileImage: influencer.profileImage,
      followers: influencer.followers,
      followersFormatted: formatNumber(influencer.followers),
      engagement: influencer.engagement,
      engagementFormatted: `${influencer.engagement}%`,
      platform: influencer.platform,
      niche: influencer.niche,
      verified: influencer.verified,
      matchScore: Math.min(Math.round(matchScore), 100)
    };
  });

  res.status(200).json({
    success: true,
    count: influencersWithScores.length,
    data: influencersWithScores
  });
});

// @desc    Get influencer dashboard (for influencer users)
// @route   GET /api/dashboard/influencer
// @access  Private (Influencer only)
exports.getInfluencerDashboard = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Find influencer profile linked to this user
  const influencer = await Influencer.findOne({ addedBy: userId }).lean();

  if (!influencer) {
    return res.status(200).json({
      success: true,
      data: {
        message: 'No influencer profile found',
        hasProfile: false
      }
    });
  }

  // Get campaigns this influencer is part of
  const campaignInfluencers = await CampaignInfluencer.find({ 
    influencer: influencer._id 
  })
    .populate('campaign', 'name status budget startDate endDate')
    .lean();

  const activeCampaigns = campaignInfluencers.filter(
    ci => ci.campaign?.status === 'active'
  );
  const completedCampaigns = campaignInfluencers.filter(
    ci => ci.campaign?.status === 'completed'
  );

  // Calculate total earnings
  let totalEarnings = 0;
  let pendingPayments = 0;
  campaignInfluencers.forEach(ci => {
    if (ci.compensation?.amount) {
      if (ci.compensation.paid) {
        totalEarnings += ci.compensation.amount;
      } else {
        pendingPayments += ci.compensation.amount;
      }
    }
  });

  res.status(200).json({
    success: true,
    data: {
      hasProfile: true,
      profile: {
        name: influencer.name,
        username: influencer.username,
        platform: influencer.platform,
        followers: influencer.followers,
        engagement: influencer.engagement,
        rating: influencer.rating
      },
      stats: {
        activeCampaigns: activeCampaigns.length,
        completedCampaigns: completedCampaigns.length,
        totalCampaigns: campaignInfluencers.length,
        totalEarnings: formatCurrency(totalEarnings),
        pendingPayments: formatCurrency(pendingPayments)
      },
      recentCampaigns: campaignInfluencers.slice(0, 5).map(ci => ({
        _id: ci._id,
        campaignName: ci.campaign?.name,
        status: ci.status,
        compensation: ci.compensation,
        performance: ci.performance
      }))
    }
  });
});

// @desc    Get dashboard analytics/charts data
// @route   GET /api/dashboard/analytics
// @access  Private
exports.getDashboardAnalytics = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { period = '30days' } = req.query;

  // Calculate date range
  let startDate;
  const endDate = new Date();
  
  switch (period) {
    case '7days':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90days':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '12months':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Get campaigns in date range
  const campaigns = await Campaign.find({
    createdBy: userId,
    createdAt: { $gte: startDate, $lte: endDate }
  }).lean();

  // Campaign status breakdown
  const statusBreakdown = await Campaign.aggregate([
    { $match: { createdBy: userId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Platform breakdown
  const platformBreakdown = await Campaign.aggregate([
    { $match: { createdBy: userId } },
    { $unwind: '$targetPlatforms' },
    { $group: { _id: '$targetPlatforms', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Monthly spend trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlySpend = await Campaign.aggregate([
    { 
      $match: { 
        createdBy: userId,
        createdAt: { $gte: sixMonthsAgo }
      } 
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        totalSpent: { $sum: '$budget.spent' },
        totalBudget: { $sum: '$budget.total' },
        campaignCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      period,
      campaignsInPeriod: campaigns.length,
      statusBreakdown: statusBreakdown.map(s => ({
        status: s._id,
        count: s.count
      })),
      platformBreakdown: platformBreakdown.map(p => ({
        platform: p._id,
        count: p.count
      })),
      monthlyTrend: monthlySpend.map(m => ({
        month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        spent: m.totalSpent,
        budget: m.totalBudget,
        campaigns: m.campaignCount
      }))
    }
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return '$0';
  
  if (amount >= 1000000) {
    return '$' + (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (amount >= 1000) {
    return '$' + (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return '$' + amount.toLocaleString();
}