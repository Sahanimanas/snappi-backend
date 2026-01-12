const Campaign = require('../models/Campaign');
const CampaignInfluencer = require('../models/CampaignInfluencer');
const { asyncHandler, getPagination } = require('../utils/helpers');

// @desc    Get all campaigns
// @route   GET /api/campaigns
// @access  Private
exports.getCampaigns = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  let query = { createdBy: req.user.id };

  if (status) {
    query.status = status;
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  // Count total documents
  const total = await Campaign.countDocuments(query);

  // Sort options
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const campaigns = await Campaign.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('influencers', 'name username platform followers engagement')
    .populate('createdBy', 'name email');

  // Get pagination details
  const pagination = getPagination(page, limit, total);

  res.status(200).json({
    success: true,
    count: campaigns.length,
    pagination,
    data: campaigns
  });
});

// @desc    Get single campaign
// @route   GET /api/campaigns/:id
// @access  Private
exports.getCampaign = asyncHandler(async (req, res, next) => {
  const campaign = await Campaign.findById(req.params.id)
    .populate('influencers', 'name username platform followers engagement profileImage')
    .populate('createdBy', 'name email company');

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  // Make sure user owns the campaign or is admin
  if (campaign.createdBy._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this campaign'
    });
  }

  res.status(200).json({
    success: true,
    data: campaign
  });
});

// @desc    Create new campaign
// @route   POST /api/campaigns
// @access  Private
exports.createCampaign = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.createdBy = req.user.id;

  const campaign = await Campaign.create(req.body);

  res.status(201).json({
    success: true,
    data: campaign
  });
});

// @desc    Update campaign
// @route   PUT /api/campaigns/:id
// @access  Private
exports.updateCampaign = asyncHandler(async (req, res, next) => {
  let campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  // Make sure user owns the campaign
  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this campaign'
    });
  }

  campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: campaign
  });
});

// @desc    Delete campaign
// @route   DELETE /api/campaigns/:id
// @access  Private
exports.deleteCampaign = asyncHandler(async (req, res, next) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  // Make sure user owns the campaign
  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this campaign'
    });
  }

  await campaign.deleteOne();

  // Also delete all campaign-influencer relationships
  await CampaignInfluencer.deleteMany({ campaign: req.params.id });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add influencer to campaign
// @route   POST /api/campaigns/:id/influencers
// @access  Private
exports.addInfluencerToCampaign = asyncHandler(async (req, res, next) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  // Make sure user owns the campaign
  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to modify this campaign'
    });
  }

  const { influencerId, compensation, trackingLink } = req.body;

  // Check if influencer already added
  const existingRelation = await CampaignInfluencer.findOne({
    campaign: req.params.id,
    influencer: influencerId
  });

  if (existingRelation) {
    return res.status(400).json({
      success: false,
      message: 'Influencer already added to this campaign'
    });
  }

  // Create campaign-influencer relationship
  const campaignInfluencer = await CampaignInfluencer.create({
    campaign: req.params.id,
    influencer: influencerId,
    compensation,
    trackingLink,
    status: 'invited'
  });

  // Add influencer to campaign's influencers array
  campaign.influencers.push(influencerId);
  await campaign.save();

  res.status(201).json({
    success: true,
    data: campaignInfluencer
  });
});

// @desc    Get campaign statistics
// @route   GET /api/campaigns/stats/overview
// @access  Private
exports.getCampaignStats = asyncHandler(async (req, res, next) => {
  const stats = await Campaign.aggregate([
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
        avgROI: { $avg: '$performance.roi' }
      }
    }
  ]);

  const statusStats = await Campaign.aggregate([
    { $match: { createdBy: req.user._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalBudget: { $sum: '$budget.total' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {},
      byStatus: statusStats
    }
  });
});

// @desc    Get campaign performance
// @route   GET /api/campaigns/:id/performance
// @access  Private
exports.getCampaignPerformance = asyncHandler(async (req, res, next) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  // Get all influencer performances for this campaign
  const influencerPerformances = await CampaignInfluencer.find({
    campaign: req.params.id,
    status: { $in: ['in_progress', 'completed'] }
  })
    .populate('influencer', 'name username platform profileImage')
    .select('influencer performance deliverables status');

  res.status(200).json({
    success: true,
    data: {
      campaignOverview: {
        name: campaign.name,
        status: campaign.status,
        budget: campaign.budget,
        performance: campaign.performance
      },
      influencerPerformances
    }
  });
});
