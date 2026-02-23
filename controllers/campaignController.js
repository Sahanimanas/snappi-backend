// controllers/campaignController.js
const Campaign = require('../models/Campaign');
const CampaignInfluencer = require('../models/CampaignInfluencer');
const { asyncHandler, getPagination } = require('../utils/helpers');
const mongoose = require('mongoose');

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

  let query = { createdBy: req.user.id };

  if (status) {
    query.status = status;
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const total = await Campaign.countDocuments(query);

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const campaigns = await Campaign.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .populate('influencers', 'name username platforms profileImage totalFollowers avgEngagement email')
    .populate('createdBy', 'name email');

  const pagination = getPagination(page, limit, total);

  res.status(200).json({
    success: true,
    count: campaigns.length,
    total,
    pagination,
    data: campaigns
  });
});

// @desc    Get single campaign by ID
// @route   GET /api/campaigns/:id
// @access  Private
exports.getCampaign = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid campaign ID'
    });
  }

  const campaign = await Campaign.findById(id)
    .populate('influencers', 'name username platforms profileImage totalFollowers avgEngagement status email')
    .populate('createdBy', 'name email company');

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  // Check authorization
  if (campaign.createdBy._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this campaign'
    });
  }

  // Get campaign influencer details with performance
  const campaignInfluencers = await CampaignInfluencer.find({ campaign: id })
    .populate('influencer', 'name username platforms profileImage totalFollowers avgEngagement')
    .select('status compensation performance deliverables invitedAt acceptedAt completedAt');

  res.status(200).json({
    success: true,
    data: {
      ...campaign.toObject(),
      campaignInfluencers
    }
  });
});

// @desc    Create new campaign
// @route   POST /api/campaigns
// @access  Private
exports.createCampaign = asyncHandler(async (req, res, next) => {
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
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid campaign ID'
    });
  }

  let campaign = await Campaign.findById(id);

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this campaign'
    });
  }

  campaign = await Campaign.findByIdAndUpdate(id, req.body, {
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
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid campaign ID'
    });
  }

  const campaign = await Campaign.findById(id);

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this campaign'
    });
  }

  await campaign.deleteOne();
  await CampaignInfluencer.deleteMany({ campaign: id });

  res.status(200).json({
    success: true,
    data: {},
    message: 'Campaign deleted successfully'
  });
});

// @desc    Add influencer to campaign
// @route   POST /api/campaigns/:id/influencers
// @access  Private
exports.addInfluencerToCampaign = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { influencerId, compensation, trackingLink } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid campaign ID'
    });
  }

  const campaign = await Campaign.findById(id);

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to modify this campaign'
    });
  }

  const existingRelation = await CampaignInfluencer.findOne({
    campaign: id,
    influencer: influencerId
  });

  if (existingRelation) {
    return res.status(400).json({
      success: false,
      message: 'Influencer already added to this campaign'
    });
  }

  const campaignInfluencer = await CampaignInfluencer.create({
    campaign: id,
    influencer: influencerId,
    compensation,
    trackingLink,
    status: 'invited',
    invitedAt: new Date()
  });

  if (!campaign.influencers.includes(influencerId)) {
    campaign.influencers.push(influencerId);
    await campaign.save();
  }

  const populated = await CampaignInfluencer.findById(campaignInfluencer._id)
    .populate('influencer', 'name username platforms profileImage');

  res.status(201).json({
    success: true,
    data: populated
  });
});

// @desc    Remove influencer from campaign
// @route   DELETE /api/campaigns/:id/influencers/:influencerId
// @access  Private
exports.removeInfluencerFromCampaign = asyncHandler(async (req, res, next) => {
  const { id, influencerId } = req.params;

  const campaign = await Campaign.findById(id);

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to modify this campaign'
    });
  }

  await CampaignInfluencer.findOneAndDelete({
    campaign: id,
    influencer: influencerId
  });

  campaign.influencers = campaign.influencers.filter(
    inf => inf.toString() !== influencerId
  );
  await campaign.save();

  res.status(200).json({
    success: true,
    message: 'Influencer removed from campaign'
  });
});

// @desc    Get campaign statistics
// @route   GET /api/campaigns/stats/overview
// @access  Private
exports.getCampaignStats = asyncHandler(async (req, res, next) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);

  const stats = await Campaign.aggregate([
    { $match: { createdBy: userId } },
    {
      $group: {
        _id: null,
        totalCampaigns: { $sum: 1 },
        activeCampaigns: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        draftCampaigns: {
          $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
        },
        completedCampaigns: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalBudget: { $sum: { $ifNull: ['$budget.total', 0] } },
        totalSpent: { $sum: { $ifNull: ['$budget.spent', 0] } },
        totalReach: { $sum: { $ifNull: ['$performance.totalReach', 0] } },
        totalEngagement: { $sum: { $ifNull: ['$performance.totalEngagement', 0] } },
        avgROI: { $avg: { $ifNull: ['$performance.roi', 0] } }
      }
    }
  ]);

  const byStatus = await Campaign.aggregate([
    { $match: { createdBy: userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalBudget: { $sum: { $ifNull: ['$budget.total', 0] } }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {
        totalCampaigns: 0,
        activeCampaigns: 0,
        draftCampaigns: 0,
        completedCampaigns: 0,
        totalBudget: 0,
        totalSpent: 0,
        totalReach: 0,
        totalEngagement: 0,
        avgROI: 0
      },
      byStatus
    }
  });
});

// @desc    Get campaign performance
// @route   GET /api/campaigns/:id/performance
// @access  Private
exports.getCampaignPerformance = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const campaign = await Campaign.findById(id);

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this campaign'
    });
  }

  const influencerPerformances = await CampaignInfluencer.find({
    campaign: id
  })
    .populate('influencer', 'name username platforms profileImage totalFollowers')
    .select('influencer performance deliverables status compensation invitedAt acceptedAt completedAt');

  res.status(200).json({
    success: true,
    data: {
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        budget: campaign.budget,
        performance: campaign.performance,
        startDate: campaign.startDate,
        endDate: campaign.endDate
      },
      influencers: influencerPerformances,
      summary: {
        totalInfluencers: influencerPerformances.length,
        invited: influencerPerformances.filter(i => i.status === 'invited').length,
        accepted: influencerPerformances.filter(i => i.status === 'accepted').length,
        inProgress: influencerPerformances.filter(i => i.status === 'in_progress').length,
        completed: influencerPerformances.filter(i => i.status === 'completed').length
      }
    }
  });
});