// controllers/campaignController.js
const Campaign = require('../models/Campaign');
const CampaignInfluencer = require('../models/CampaignInfluencer');
const Influencer = require('../models/Influencer');
const TrackingLink = require('../models/TrackingLink');
const { asyncHandler, getPagination } = require('../utils/helpers');
const { notifyInfluencerContacted } = require('../utils/emailService');
const mongoose = require('mongoose');

// @desc    Get all campaigns
// @route   GET /api/campaigns
// @query   page, limit, status, search, sortBy, sortOrder, platform, objective, view (itd|in_month)
// @access  Private
exports.getCampaigns = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    platform,
    objective,
    view
  } = req.query;

  let query = { createdBy: req.user.id };

  // Status filter
  if (status) {
    query.status = status;
  }

  // Search by name
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  // Platform filter (server-side)
  if (platform) {
    query.targetPlatforms = { $in: [platform.toLowerCase()] };
  }

  // Objective filter (server-side)
  if (objective) {
    query.objective = objective;
  }

  // In-month filter
  if (view === 'in_month') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    query.createdAt = { $gte: startOfMonth };
  }

  const total = await Campaign.countDocuments(query);

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const campaigns = await Campaign.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .populate('influencers', 'name username platforms profileImage totalFollowers avgEngagement')
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

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid campaign ID'
    });
  }

  const campaign = await Campaign.findById(id)
    .populate('influencers', 'name username platforms profileImage totalFollowers avgEngagement status')
    .populate('createdBy', 'name email company');

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  if (campaign.createdBy._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this campaign'
    });
  }

  // Get campaign influencer details with performance and contact/contract status
  const campaignInfluencers = await CampaignInfluencer.find({ campaign: id })
    .populate('influencer', 'name username platforms profileImage totalFollowers avgEngagement email contactInfo')
    .select('status contacted contactedAt contactMethod contractSigned contractSignedAt contractUrl briefSent briefSentAt dueDate compensation performance deliverables invitedAt acceptedAt completedAt');

  // Get tracking link performance data
  const trackingPerformance = await TrackingLink.aggregate([
    { $match: { campaign: new mongoose.Types.ObjectId(id) } },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$totalPerformance.totalViews' },
        totalLikes: { $sum: '$totalPerformance.totalLikes' },
        totalComments: { $sum: '$totalPerformance.totalComments' },
        totalShares: { $sum: '$totalPerformance.totalShares' },
        totalClicks: { $sum: '$totalPerformance.totalClicks' },
        totalReach: { $sum: '$totalPerformance.totalReach' },
        totalSaves: { $sum: { $ifNull: ['$totalPerformance.totalSaves', 0] } }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...campaign.toObject(),
      campaignInfluencers,
      trackingPerformance: trackingPerformance[0] || {
        totalViews: 0, totalLikes: 0, totalComments: 0,
        totalShares: 0, totalClicks: 0, totalReach: 0, totalSaves: 0
      }
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

// @desc    Contact influencer for campaign
// @route   PUT /api/campaigns/:id/influencers/:influencerId/contact
// @access  Private
exports.contactInfluencer = asyncHandler(async (req, res, next) => {
  const { id, influencerId } = req.params;
  const { contactMethod, message } = req.body;

  const campaign = await Campaign.findById(id);
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  let campaignInfluencer = await CampaignInfluencer.findOne({
    campaign: id,
    influencer: influencerId
  });

  if (!campaignInfluencer) {
    return res.status(404).json({ success: false, message: 'Influencer not found in this campaign' });
  }

  campaignInfluencer.contacted = true;
  campaignInfluencer.contactedAt = new Date();
  campaignInfluencer.contactMethod = contactMethod || 'email';
  if (campaignInfluencer.status === 'invited') {
    campaignInfluencer.status = 'contacted';
  }
  await campaignInfluencer.save();

  // Send email notification (non-blocking)
  const influencer = await Influencer.findById(influencerId);
  if (influencer?.email || influencer?.contactInfo?.email) {
    notifyInfluencerContacted(
      req.user.email,
      req.user.name || 'Brand',
      influencer.name,
      campaign.name
    ).catch(err => console.error('Email notification failed:', err));
  }

  const populated = await CampaignInfluencer.findById(campaignInfluencer._id)
    .populate('influencer', 'name username platforms profileImage email contactInfo');

  res.status(200).json({
    success: true,
    message: 'Influencer contacted successfully',
    data: populated
  });
});

// @desc    Upload contract for influencer in campaign
// @route   PUT /api/campaigns/:id/influencers/:influencerId/contract
// @access  Private
exports.uploadContract = asyncHandler(async (req, res, next) => {
  const { id, influencerId } = req.params;

  const campaign = await Campaign.findById(id);
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  let campaignInfluencer = await CampaignInfluencer.findOne({
    campaign: id,
    influencer: influencerId
  });

  if (!campaignInfluencer) {
    return res.status(404).json({ success: false, message: 'Influencer not found in this campaign' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a contract file' });
  }

  campaignInfluencer.contractUrl = `/uploads/contracts/${req.file.filename}`;
  campaignInfluencer.contractSigned = true;
  campaignInfluencer.contractSignedAt = new Date();
  await campaignInfluencer.save();

  // Also update the campaign contract field
  campaign.contract = {
    templateUsed: true,
    fileUrl: campaignInfluencer.contractUrl,
    uploadedAt: new Date()
  };
  await campaign.save();

  res.status(200).json({
    success: true,
    message: 'Contract uploaded successfully',
    data: {
      contractUrl: campaignInfluencer.contractUrl,
      contractSignedAt: campaignInfluencer.contractSignedAt
    }
  });
});

// @desc    Send brief to influencer
// @route   PUT /api/campaigns/:id/influencers/:influencerId/brief
// @access  Private
exports.sendBrief = asyncHandler(async (req, res, next) => {
  const { id, influencerId } = req.params;

  const campaign = await Campaign.findById(id);
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  let campaignInfluencer = await CampaignInfluencer.findOne({
    campaign: id,
    influencer: influencerId
  });

  if (!campaignInfluencer) {
    return res.status(404).json({ success: false, message: 'Influencer not found in this campaign' });
  }

  const { dueDate } = req.body;

  campaignInfluencer.briefSent = true;
  campaignInfluencer.briefSentAt = new Date();
  if (dueDate) {
    campaignInfluencer.dueDate = new Date(dueDate);
  }
  if (campaignInfluencer.status === 'contacted' || campaignInfluencer.status === 'accepted') {
    campaignInfluencer.status = 'in_progress';
  }
  await campaignInfluencer.save();

  res.status(200).json({
    success: true,
    message: 'Brief sent successfully',
    data: campaignInfluencer
  });
});

// @desc    Export campaigns data as JSON (for CSV conversion on frontend)
// @route   GET /api/campaigns/export
// @access  Private
exports.exportCampaigns = asyncHandler(async (req, res, next) => {
  const { status, platform, objective, view } = req.query;

  let query = { createdBy: req.user.id };

  if (status) query.status = status;
  if (platform) query.targetPlatforms = { $in: [platform.toLowerCase()] };
  if (objective) query.objective = objective;
  if (view === 'in_month') {
    const now = new Date();
    query.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }

  const campaigns = await Campaign.find(query)
    .sort({ createdAt: -1 })
    .lean();

  const campaignIds = campaigns.map(c => c._id);

  // Get influencer counts per campaign
  const influencerCounts = await CampaignInfluencer.aggregate([
    { $match: { campaign: { $in: campaignIds } } },
    { $group: { _id: '$campaign', count: { $sum: 1 } } }
  ]);
  const countMap = {};
  influencerCounts.forEach(ic => { countMap[ic._id.toString()] = ic.count; });

  // Get tracking performance per campaign
  const trackingStats = await TrackingLink.aggregate([
    { $match: { campaign: { $in: campaignIds } } },
    {
      $group: {
        _id: '$campaign',
        totalViews: { $sum: '$totalPerformance.totalViews' },
        totalLikes: { $sum: '$totalPerformance.totalLikes' },
        totalComments: { $sum: '$totalPerformance.totalComments' },
        totalShares: { $sum: '$totalPerformance.totalShares' },
        totalClicks: { $sum: '$totalPerformance.totalClicks' },
        totalReach: { $sum: '$totalPerformance.totalReach' }
      }
    }
  ]);
  const trackMap = {};
  trackingStats.forEach(t => { trackMap[t._id.toString()] = t; });

  const exportData = campaigns.map(c => {
    const tracking = trackMap[c._id.toString()] || {};
    return {
      name: c.name,
      status: c.status,
      objective: c.objective,
      campaignType: c.campaignType,
      startDate: c.startDate,
      endDate: c.endDate,
      currency: c.budget?.currency || 'USD',
      totalBudget: c.budget?.total || 0,
      spent: c.budget?.spent || 0,
      remaining: c.budget?.remaining || 0,
      influencerCount: countMap[c._id.toString()] || 0,
      platforms: (c.targetPlatforms || []).join(', '),
      views: c.performance?.totalViews || tracking.totalViews || 0,
      likes: c.performance?.totalLikes || tracking.totalLikes || 0,
      comments: c.performance?.totalComments || tracking.totalComments || 0,
      shares: c.performance?.totalShares || tracking.totalShares || 0,
      clicks: c.performance?.totalClicks || tracking.totalClicks || 0,
      reach: c.performance?.totalReach || tracking.totalReach || 0,
      conversions: c.performance?.totalConversions || 0,
      roi: c.performance?.roi || 0,
      scope: c.scope || '',
      successMetrics: c.successMetrics || '',
      createdAt: c.createdAt
    };
  });

  res.status(200).json({
    success: true,
    data: {
      exportDate: new Date().toISOString(),
      campaigns: exportData,
      count: exportData.length
    }
  });
});

// @desc    Get dynamic deliverables options based on platform
// @route   GET /api/campaigns/deliverables/:platform
// @access  Private
exports.getDeliverablesByPlatform = asyncHandler(async (req, res, next) => {
  const { platform } = req.params;

  const deliverablesByPlatform = {
    instagram: [
      { type: 'post', label: 'Feed Post', description: 'Single image or carousel post' },
      { type: 'story', label: 'Story', description: 'Instagram story (24-hour)' },
      { type: 'reel', label: 'Reel', description: 'Short-form video (up to 90 seconds)' },
      { type: 'video', label: 'IGTV/Live', description: 'Long-form video or live stream' }
    ],
    youtube: [
      { type: 'video', label: 'Video', description: 'Dedicated or integrated YouTube video' },
      { type: 'short', label: 'Short', description: 'YouTube Short (up to 60 seconds)' },
      { type: 'review', label: 'Review', description: 'Product review video' }
    ],
    tiktok: [
      { type: 'video', label: 'TikTok Video', description: 'TikTok video content' },
      { type: 'story', label: 'TikTok Story', description: 'TikTok story (24-hour)' }
    ],
    facebook: [
      { type: 'post', label: 'Post', description: 'Facebook post' },
      { type: 'story', label: 'Story', description: 'Facebook story' },
      { type: 'reel', label: 'Reel', description: 'Facebook Reel' },
      { type: 'video', label: 'Video', description: 'Facebook video' }
    ],
    twitter: [
      { type: 'post', label: 'Tweet', description: 'Twitter/X post' },
      { type: 'video', label: 'Video Tweet', description: 'Tweet with video' }
    ],
    linkedin: [
      { type: 'post', label: 'Post', description: 'LinkedIn post' },
      { type: 'blog', label: 'Article', description: 'LinkedIn article' },
      { type: 'video', label: 'Video', description: 'LinkedIn video' }
    ],
    snapchat: [
      { type: 'story', label: 'Snap Story', description: 'Snapchat story' },
      { type: 'video', label: 'Spotlight', description: 'Snapchat Spotlight video' }
    ],
    threads: [
      { type: 'post', label: 'Thread Post', description: 'Threads post' }
    ],
    pinterest: [
      { type: 'post', label: 'Pin', description: 'Pinterest Pin' },
      { type: 'video', label: 'Video Pin', description: 'Pinterest video pin' }
    ]
  };

  const deliverables = deliverablesByPlatform[platform.toLowerCase()] || [];

  res.status(200).json({
    success: true,
    platform,
    data: deliverables
  });
});

// @desc    Get campaign statistics
// @route   GET /api/campaigns/stats/overview
// @access  Private
exports.getCampaignStats = asyncHandler(async (req, res, next) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const view = req.query.view || 'itd';

  let matchQuery = { createdBy: userId };
  if (view === 'in_month') {
    const now = new Date();
    matchQuery.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }

  const stats = await Campaign.aggregate([
    { $match: matchQuery },
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
        totalViews: { $sum: { $ifNull: ['$performance.totalViews', 0] } },
        totalLikes: { $sum: { $ifNull: ['$performance.totalLikes', 0] } },
        totalComments: { $sum: { $ifNull: ['$performance.totalComments', 0] } },
        totalShares: { $sum: { $ifNull: ['$performance.totalShares', 0] } },
        totalSaves: { $sum: { $ifNull: ['$performance.totalSaves', 0] } },
        avgROI: { $avg: { $ifNull: ['$performance.roi', 0] } }
      }
    }
  ]);

  const byStatus = await Campaign.aggregate([
    { $match: matchQuery },
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
      view,
      overview: stats[0] || {
        totalCampaigns: 0,
        activeCampaigns: 0,
        draftCampaigns: 0,
        completedCampaigns: 0,
        totalBudget: 0,
        totalSpent: 0,
        totalReach: 0,
        totalEngagement: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalSaves: 0,
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
    .select('influencer performance deliverables status contacted contactedAt contractSigned dueDate compensation invitedAt acceptedAt completedAt');

  // Get per-post metrics from tracking links
  const trackingLinks = await TrackingLink.find({ campaign: id })
    .populate('influencer', 'name')
    .select('influencer submittedPosts totalPerformance');

  const postMetrics = [];
  trackingLinks.forEach(tl => {
    (tl.submittedPosts || []).forEach(post => {
      if (post.status === 'approved') {
        postMetrics.push({
          influencer: tl.influencer?.name,
          platform: post.platform,
          postUrl: post.postUrl,
          views: post.metrics?.views || 0,
          likes: post.metrics?.likes || 0,
          comments: post.metrics?.comments || 0,
          shares: post.metrics?.shares || 0,
          saves: post.metrics?.saves || 0,
          clicks: post.metrics?.clicks || 0,
          submittedAt: post.submittedAt
        });
      }
    });
  });

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
      postMetrics,
      summary: {
        totalInfluencers: influencerPerformances.length,
        invited: influencerPerformances.filter(i => i.status === 'invited').length,
        contacted: influencerPerformances.filter(i => i.contacted).length,
        accepted: influencerPerformances.filter(i => i.status === 'accepted').length,
        inProgress: influencerPerformances.filter(i => i.status === 'in_progress').length,
        completed: influencerPerformances.filter(i => i.status === 'completed').length,
        contractsSigned: influencerPerformances.filter(i => i.contractSigned).length
      }
    }
  });
});
