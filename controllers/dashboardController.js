const Campaign = require('../models/Campaign');
const Influencer = require('../models/Influencer');
const CampaignInfluencer = require('../models/CampaignInfluencer');
const TrackingLink = require('../models/TrackingLink');
const { asyncHandler } = require('../utils/helpers');

// @desc    Get dashboard overview (main dashboard page)
// @route   GET /api/dashboard
// @query   view=itd|in_month (default: itd)
// @access  Private
exports.getDashboardOverview = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const view = req.query.view || 'itd'; // 'itd' = Inception-to-Date, 'in_month' = current month only

  // ============================================
  // 1. CAMPAIGN STATS (ITD or In-Month)
  // ============================================

  let campaignQuery = { createdBy: userId };

  // For in-month view, only include current month's data
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  if (view === 'in_month') {
    campaignQuery.createdAt = { $gte: startOfThisMonth };
  }

  const allCampaigns = await Campaign.find(campaignQuery);

  // For ITD: count all active; for in-month: count active campaigns created this month
  const activeCampaigns = view === 'in_month'
    ? allCampaigns.filter(c => c.status === 'active').length
    : await Campaign.countDocuments({ createdBy: userId, status: 'active' });

  // Calculate totals from campaigns
  let totalBudget = 0;
  let totalSpent = 0;
  let totalReach = 0;
  let totalEngagement = 0;
  let totalConversions = 0;
  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalSaves = 0;

  allCampaigns.forEach(campaign => {
    if (campaign.budget) {
      totalBudget += campaign.budget.total || 0;
      totalSpent += campaign.budget.spent || 0;
    }
    if (campaign.performance) {
      totalReach += campaign.performance.totalReach || 0;
      totalEngagement += campaign.performance.totalEngagement || 0;
      totalConversions += campaign.performance.totalConversions || 0;
      totalViews += campaign.performance.totalViews || 0;
      totalLikes += campaign.performance.totalLikes || 0;
      totalComments += campaign.performance.totalComments || 0;
      totalShares += campaign.performance.totalShares || 0;
      totalSaves += campaign.performance.totalSaves || 0;
    }
  });

  // Also aggregate from tracking links for accurate performance data
  const campaignIds = allCampaigns.map(c => c._id);
  const trackingPerformance = await TrackingLink.aggregate([
    { $match: { campaign: { $in: campaignIds } } },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$totalPerformance.totalViews' },
        totalLikes: { $sum: '$totalPerformance.totalLikes' },
        totalComments: { $sum: '$totalPerformance.totalComments' },
        totalShares: { $sum: '$totalPerformance.totalShares' },
        totalClicks: { $sum: '$totalPerformance.totalClicks' },
        totalReach: { $sum: '$totalPerformance.totalReach' },
        totalImpressions: { $sum: '$totalPerformance.totalImpressions' }
      }
    }
  ]);

  if (trackingPerformance[0]) {
    const tp = trackingPerformance[0];
    // Use tracking data if it has values (more accurate than campaign aggregates)
    if (tp.totalViews > 0) totalViews = tp.totalViews;
    if (tp.totalLikes > 0) totalLikes = tp.totalLikes;
    if (tp.totalComments > 0) totalComments = tp.totalComments;
    if (tp.totalShares > 0) totalShares = tp.totalShares;
    if (tp.totalReach > 0) totalReach = tp.totalReach;
  }

  // For ITD, also calculate reach from all influencer followers
  if (view === 'itd') {
    const reachAggregation = await Influencer.aggregate([
      {
        $group: {
          _id: null,
          totalReach: { $sum: '$followers' },
          totalInfluencers: { $sum: 1 }
        }
      }
    ]);
    if (reachAggregation[0]?.totalReach > totalReach) {
      totalReach = reachAggregation[0].totalReach;
    }
  }

  // Calculate ROI
  const conversionValue = 100;
  const estimatedRevenue = totalConversions * conversionValue;
  const roi = totalSpent > 0 ? ((estimatedRevenue - totalSpent) / totalSpent) * 100 : 0;

  // ============================================
  // 2. MONTH OVER MONTH COMPARISON
  // ============================================

  const thisMonthCampaigns = await Campaign.find({
    createdBy: userId,
    createdAt: { $gte: startOfThisMonth }
  });

  const lastMonthCampaigns = await Campaign.find({
    createdBy: userId,
    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
  });

  const thisMonthActive = thisMonthCampaigns.filter(c => c.status === 'active').length;
  const lastMonthActive = lastMonthCampaigns.filter(c => c.status === 'active').length;
  const activeCampaignsChange = thisMonthActive - lastMonthActive;

  let thisMonthReach = 0, lastMonthReach = 0;
  let thisMonthSpent = 0, lastMonthSpent = 0;
  let thisMonthROI = 0, lastMonthROI = 0;

  thisMonthCampaigns.forEach(c => {
    thisMonthReach += c.performance?.totalReach || 0;
    thisMonthSpent += c.budget?.spent || 0;
    thisMonthROI += c.performance?.roi || 0;
  });

  lastMonthCampaigns.forEach(c => {
    lastMonthReach += c.performance?.totalReach || 0;
    lastMonthSpent += c.budget?.spent || 0;
    lastMonthROI += c.performance?.roi || 0;
  });

  const reachChangePercent = lastMonthReach > 0
    ? Math.round(((thisMonthReach - lastMonthReach) / lastMonthReach) * 100)
    : (thisMonthReach > 0 ? 100 : 0);

  const spentChangePercent = lastMonthSpent > 0
    ? Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100)
    : (thisMonthSpent > 0 ? 100 : 0);

  const roiChangePercent = lastMonthROI > 0
    ? Math.round(((thisMonthROI - lastMonthROI) / lastMonthROI) * 100)
    : (thisMonthROI > 0 ? 100 : 0);

  // ============================================
  // 3. RECENT CAMPAIGNS (last 5)
  // ============================================

  const recentCampaigns = await Campaign.find({ createdBy: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

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
        currency: campaign.budget?.currency || 'USD',
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
    .sort({ engagement: -1 })
    .limit(5)
    .select('name username profileImage followers engagement platform niche verified')
    .lean();

  const formattedTopInfluencers = topInfluencers.map(influencer => {
    let matchScore = 0;
    matchScore += Math.min((influencer.engagement || 0) * 8, 60);
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
      view, // 'itd' or 'in_month'
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
          changePercent: roiChangePercent,
          changeLabel: 'from last month'
        },
        totalSpend: {
          value: totalSpent,
          formatted: formatCurrency(totalSpent),
          changePercent: spentChangePercent,
          changeLabel: 'from last month'
        }
      },
      performanceMetrics: {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        saves: totalSaves,
        clicks: trackingPerformance[0]?.totalClicks || 0
      },
      recentCampaigns: recentCampaignsWithInfluencers,
      topPerformingInfluencers: formattedTopInfluencers,
      summary: {
        totalCampaigns: view === 'itd'
          ? await Campaign.countDocuments({ createdBy: userId })
          : allCampaigns.length,
        totalBudget: totalBudget,
        totalInfluencersWorkedWith: await CampaignInfluencer.countDocuments({
          campaign: { $in: campaignIds }
        })
      }
    }
  });
});

// @desc    Get dashboard stats only (lightweight endpoint)
// @route   GET /api/dashboard/stats
// @query   view=itd|in_month
// @access  Private
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const view = req.query.view || 'itd';

  let campaignQuery = { createdBy: userId };

  if (view === 'in_month') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    campaignQuery.createdAt = { $gte: startOfMonth };
  }

  const [activeCampaigns, allCampaigns] = await Promise.all([
    view === 'in_month'
      ? Campaign.countDocuments({ ...campaignQuery, status: 'active' })
      : Campaign.countDocuments({ createdBy: userId, status: 'active' }),
    Campaign.find(campaignQuery).select('budget performance').lean()
  ]);

  let totalSpent = 0;
  let totalReach = 0;
  let totalConversions = 0;

  allCampaigns.forEach(campaign => {
    totalSpent += campaign.budget?.spent || 0;
    totalReach += campaign.performance?.totalReach || 0;
    totalConversions += campaign.performance?.totalConversions || 0;
  });

  const conversionValue = 100;
  const estimatedRevenue = totalConversions * conversionValue;
  const roi = totalSpent > 0 ? ((estimatedRevenue - totalSpent) / totalSpent) * 100 : 0;

  res.status(200).json({
    success: true,
    data: {
      view,
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

// @desc    Export dashboard data as JSON (for CSV conversion on frontend)
// @route   GET /api/dashboard/export
// @query   view=itd|in_month
// @access  Private
exports.exportDashboardData = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const view = req.query.view || 'itd';

  let campaignQuery = { createdBy: userId };
  if (view === 'in_month') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    campaignQuery.createdAt = { $gte: startOfMonth };
  }

  // Get all campaigns with full details
  const campaigns = await Campaign.find(campaignQuery)
    .populate('influencers', 'name email')
    .lean();

  // Get tracking performance per campaign
  const campaignIds = campaigns.map(c => c._id);
  const trackingStats = await TrackingLink.aggregate([
    { $match: { campaign: { $in: campaignIds } } },
    {
      $group: {
        _id: '$campaign',
        totalLinks: { $sum: 1 },
        totalPosts: { $sum: { $size: { $ifNull: ['$submittedPosts', []] } } },
        totalViews: { $sum: '$totalPerformance.totalViews' },
        totalLikes: { $sum: '$totalPerformance.totalLikes' },
        totalComments: { $sum: '$totalPerformance.totalComments' },
        totalShares: { $sum: '$totalPerformance.totalShares' },
        totalClicks: { $sum: '$totalPerformance.totalClicks' },
        totalReach: { $sum: '$totalPerformance.totalReach' }
      }
    }
  ]);

  const trackingMap = {};
  trackingStats.forEach(t => { trackingMap[t._id.toString()] = t; });

  // Get influencer counts
  const influencerCounts = await CampaignInfluencer.aggregate([
    { $match: { campaign: { $in: campaignIds } } },
    { $group: { _id: '$campaign', count: { $sum: 1 } } }
  ]);
  const influencerCountMap = {};
  influencerCounts.forEach(ic => { influencerCountMap[ic._id.toString()] = ic.count; });

  // Build export data
  const exportData = campaigns.map(campaign => {
    const tracking = trackingMap[campaign._id.toString()] || {};
    return {
      campaignName: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      campaignType: campaign.campaignType,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      currency: campaign.budget?.currency || 'USD',
      totalBudget: campaign.budget?.total || 0,
      spent: campaign.budget?.spent || 0,
      remaining: campaign.budget?.remaining || 0,
      influencerCount: influencerCountMap[campaign._id.toString()] || 0,
      targetPlatforms: (campaign.targetPlatforms || []).join(', '),
      // Performance
      reach: campaign.performance?.totalReach || tracking.totalReach || 0,
      engagement: campaign.performance?.totalEngagement || 0,
      views: campaign.performance?.totalViews || tracking.totalViews || 0,
      likes: campaign.performance?.totalLikes || tracking.totalLikes || 0,
      comments: campaign.performance?.totalComments || tracking.totalComments || 0,
      shares: campaign.performance?.totalShares || tracking.totalShares || 0,
      clicks: campaign.performance?.totalClicks || tracking.totalClicks || 0,
      conversions: campaign.performance?.totalConversions || 0,
      roi: campaign.performance?.roi || 0,
      // Tracking
      trackingLinks: tracking.totalLinks || 0,
      totalPosts: tracking.totalPosts || 0,
      createdAt: campaign.createdAt
    };
  });

  // Calculate totals
  const totals = exportData.reduce((acc, row) => {
    acc.totalBudget += row.totalBudget;
    acc.spent += row.spent;
    acc.views += row.views;
    acc.likes += row.likes;
    acc.comments += row.comments;
    acc.shares += row.shares;
    acc.clicks += row.clicks;
    acc.reach += row.reach;
    acc.conversions += row.conversions;
    return acc;
  }, { totalBudget: 0, spent: 0, views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0, conversions: 0 });

  res.status(200).json({
    success: true,
    data: {
      view,
      exportDate: new Date().toISOString(),
      campaigns: exportData,
      totals,
      campaignCount: exportData.length
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
        currency: campaign.budget?.currency || 'USD',
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
  const sortBy = req.query.sortBy || 'engagement';

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

  const influencersWithScores = topInfluencers.map(influencer => {
    let matchScore = 0;
    matchScore += Math.min((influencer.engagement || 0) * 8, 60);
    const followers = influencer.followers || 0;
    if (followers >= 1000000) matchScore += 25;
    else if (followers >= 500000) matchScore += 20;
    else if (followers >= 100000) matchScore += 15;
    else if (followers >= 10000) matchScore += 10;
    else matchScore += 5;
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

  const campaigns = await Campaign.find({
    createdBy: userId,
    createdAt: { $gte: startDate, $lte: endDate }
  }).lean();

  const statusBreakdown = await Campaign.aggregate([
    { $match: { createdBy: userId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const platformBreakdown = await Campaign.aggregate([
    { $match: { createdBy: userId } },
    { $unwind: '$targetPlatforms' },
    { $group: { _id: '$targetPlatforms', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

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
