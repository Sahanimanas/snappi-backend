const Campaign = require('../models/Campaign');
const Influencer = require('../models/Influencer');
const CampaignInfluencer = require('../models/CampaignInfluencer');
const { asyncHandler } = require('../utils/helpers');

// @desc    Get dashboard overview
// @route   GET /api/dashboard
// @access  Private
exports.getDashboard = asyncHandler(async (req, res, next) => {
  // Campaign statistics
  const campaignStats = await Campaign.aggregate([
    { $match: { createdBy: req.user._id } },
    {
      $group: {
        _id: null,
        totalCampaigns: { $sum: 1 },
        activeCampaigns: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalBudget: { $sum: '$budget.total' },
        totalSpent: { $sum: '$budget.spent' },
        totalReach: { $sum: '$performance.totalReach' },
        totalEngagement: { $sum: '$performance.totalEngagement' },
        avgROI: { $avg: '$performance.roi' }
      }
    }
  ]);

  // Get recent campaigns
  const recentCampaigns = await Campaign.find({ createdBy: req.user.id })
    .sort('-createdAt')
    .limit(5)
    .select('name status budget performance startDate endDate')
    .populate('influencers', 'name');

  // Get active collaborations count
  const activeCollaborations = await CampaignInfluencer.countDocuments({
    campaign: { 
      $in: await Campaign.find({ createdBy: req.user.id }).distinct('_id')
    },
    status: { $in: ['accepted', 'in_progress'] }
  });

  // Get top performing influencers
  const topInfluencers = await CampaignInfluencer.aggregate([
    {
      $match: {
        campaign: { 
          $in: await Campaign.find({ createdBy: req.user.id }).distinct('_id')
        },
        status: { $in: ['in_progress', 'completed'] }
      }
    },
    {
      $group: {
        _id: '$influencer',
        totalReach: { $sum: '$performance.reach' },
        totalEngagement: { $sum: '$performance.engagement' },
        avgEngagementRate: { $avg: '$performance.engagementRate' },
        campaignsCount: { $sum: 1 }
      }
    },
    { $sort: { avgEngagementRate: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'influencers',
        localField: '_id',
        foreignField: '_id',
        as: 'influencer'
      }
    },
    { $unwind: '$influencer' },
    {
      $project: {
        _id: 1,
        name: '$influencer.name',
        username: '$influencer.username',
        platform: '$influencer.platform',
        profileImage: '$influencer.profileImage',
        totalReach: 1,
        totalEngagement: 1,
        avgEngagementRate: 1,
        campaignsCount: 1
      }
    }
  ]);

  // Calculate month-over-month changes
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const lastMonthStats = await Campaign.aggregate([
    { 
      $match: { 
        createdBy: req.user._id,
        createdAt: { $gte: lastMonth }
      } 
    },
    {
      $group: {
        _id: null,
        activeCampaigns: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalReach: { $sum: '$performance.totalReach' },
        totalSpent: { $sum: '$budget.spent' },
        avgROI: { $avg: '$performance.roi' }
      }
    }
  ]);

  // Calculate performance changes
  const currentStats = campaignStats[0] || {};
  const previousStats = lastMonthStats[0] || {};

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(2);
  };

  res.status(200).json({
    success: true,
    data: {
      overview: {
        activeCampaigns: currentStats.activeCampaigns || 0,
        totalReach: currentStats.totalReach || 0,
        campaignROI: currentStats.avgROI || 0,
        totalSpend: currentStats.totalSpent || 0,
        activeCollaborations
      },
      changes: {
        activeCampaigns: calculateChange(
          currentStats.activeCampaigns,
          previousStats.activeCampaigns
        ),
        totalReach: calculateChange(
          currentStats.totalReach,
          previousStats.totalReach
        ),
        roi: calculateChange(currentStats.avgROI, previousStats.avgROI),
        spend: calculateChange(
          currentStats.totalSpent,
          previousStats.totalSpent
        )
      },
      recentCampaigns,
      topPerformingInfluencers: topInfluencers
    }
  });
});

// @desc    Get influencer dashboard data
// @route   GET /api/dashboard/influencers
// @access  Private
exports.getInfluencerDashboard = asyncHandler(async (req, res, next) => {
  // Total influencers
  const totalInfluencers = await Influencer.countDocuments();

  // Active collaborations (from user's campaigns)
  const userCampaignIds = await Campaign.find({ createdBy: req.user.id }).distinct('_id');
  
  const activeCollaborations = await CampaignInfluencer.countDocuments({
    campaign: { $in: userCampaignIds },
    status: { $in: ['accepted', 'in_progress'] }
  });

  // Calculate average engagement
  const engagementStats = await Influencer.aggregate([
    {
      $group: {
        _id: null,
        avgEngagement: { $avg: '$engagement' },
        totalReach: { $sum: '$followers' }
      }
    }
  ]);

  // Get new influencers this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const newThisMonth = await Influencer.countDocuments({
    createdAt: { $gte: startOfMonth }
  });

  // Last month comparison
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  lastMonth.setDate(1);

  const lastMonthInfluencers = await Influencer.countDocuments({
    createdAt: { 
      $gte: lastMonth,
      $lt: startOfMonth
    }
  });

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(2);
  };

  res.status(200).json({
    success: true,
    data: {
      totalInfluencers,
      activeCollaborations,
      avgEngagement: engagementStats[0]?.avgEngagement?.toFixed(1) || 0,
      totalReach: engagementStats[0]?.totalReach || 0,
      changes: {
        newInfluencers: calculateChange(newThisMonth, lastMonthInfluencers),
        collaborations: `+${activeCollaborations}`
      }
    }
  });
});
