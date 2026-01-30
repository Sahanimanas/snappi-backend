// controllers/trackingLinkController.js
const TrackingLink = require('../models/TrackingLink');
const Campaign = require('../models/Campaign');
const Influencer = require('../models/Influencer');
const CampaignInfluencer = require('../models/CampaignInfluencer');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// Helper to get user ID from request
const getUserId = (req) => {
  if (!req.user) return null;
  return req.user.id || req.user._id;
};

// Helper to check auth and return user ID
const checkAuth = (req, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authorized - please log in' });
    return null;
  }
  return getUserId(req);
};

// Helper function to create URL-friendly slug from campaign name
const createSlug = (name) => {
  if (!name) return 'campaign';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')       // Replace spaces with hyphens
    .replace(/-+/g, '-')        // Replace multiple hyphens with single
    .substring(0, 50);          // Limit length
};

// @desc    Generate tracking link for influencer in campaign
// @route   POST /api/tracking-links/generate
// @access  Private
exports.generateTrackingLink = asyncHandler(async (req, res, next) => {
  const { campaignId, influencerId, destinationUrl, notes } = req.body;

  // Check if user is authenticated
  const userId = checkAuth(req, res);
  if (!userId) return;

  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(campaignId) || !mongoose.Types.ObjectId.isValid(influencerId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid campaign or influencer ID'
    });
  }

  // Check campaign exists and user has access
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  if (campaign.createdBy.toString() !== userId.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this campaign'
    });
  }

  // Check influencer exists
  const influencer = await Influencer.findById(influencerId);
  if (!influencer) {
    return res.status(404).json({
      success: false,
      message: 'Influencer not found'
    });
  }

  // Check if tracking link already exists
  let trackingLink = await TrackingLink.findOne({
    campaign: campaignId,
    influencer: influencerId
  });

  if (trackingLink) {
    return res.status(200).json({
      success: true,
      message: 'Tracking link already exists',
      data: trackingLink
    });
  }

  // Find or create CampaignInfluencer relationship
  let campaignInfluencer = await CampaignInfluencer.findOne({
    campaign: campaignId,
    influencer: influencerId
  });

  if (!campaignInfluencer) {
    campaignInfluencer = await CampaignInfluencer.create({
      campaign: campaignId,
      influencer: influencerId,
      status: 'invited',
      invitedAt: new Date()
    });

    // Add influencer to campaign if not already
    if (!campaign.influencers.includes(influencerId)) {
      campaign.influencers.push(influencerId);
      await campaign.save();
    }
  }

  // Create campaign slug from campaign name
  const campaignSlug = createSlug(campaign.name);

  // Create tracking link with campaign slug
  trackingLink = await TrackingLink.create({
    campaign: campaignId,
    influencer: influencerId,
    campaignInfluencer: campaignInfluencer._id,
    createdBy: userId,
    campaignSlug: campaignSlug,  // Pass the campaign slug
    destinationUrl: destinationUrl || campaign.targetUrl || '',
    notes,
    utmParams: {
      source: 'influencer',
      medium: 'social',
      campaign: campaignSlug,
      content: influencer.name?.toLowerCase().replace(/\s+/g, '-')
    }
  });

  // Update CampaignInfluencer with tracking link reference
  campaignInfluencer.trackingLink = trackingLink._id;
  await campaignInfluencer.save();

  // Populate and return
  await trackingLink.populate([
    { path: 'campaign', select: 'name status startDate endDate' },
    { path: 'influencer', select: 'name email profileImage platforms' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Tracking link generated successfully',
    data: trackingLink
  });
});

// @desc    Get all tracking links for a campaign
// @route   GET /api/tracking-links/campaign/:campaignId
// @access  Private
exports.getCampaignTrackingLinks = asyncHandler(async (req, res, next) => {
  const { campaignId } = req.params;

  const userId = checkAuth(req, res);
  if (!userId) return;

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid campaign ID'
    });
  }

  // Check campaign exists and user has access
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: 'Campaign not found'
    });
  }

  if (campaign.createdBy.toString() !== userId.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this campaign'
    });
  }

  const trackingLinks = await TrackingLink.find({ campaign: campaignId })
    .populate('influencer', 'name email profileImage platforms')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: trackingLinks.length,
    data: trackingLinks
  });
});

// @desc    Get single tracking link
// @route   GET /api/tracking-links/:id
// @access  Private
exports.getTrackingLink = asyncHandler(async (req, res, next) => {
  const userId = checkAuth(req, res);
  if (!userId) return;

  const trackingLink = await TrackingLink.findById(req.params.id)
    .populate('campaign', 'name status startDate endDate budget')
    .populate('influencer', 'name email profileImage platforms')
    .populate('submittedPosts.reviewedBy', 'name');

  if (!trackingLink) {
    return res.status(404).json({
      success: false,
      message: 'Tracking link not found'
    });
  }

  res.status(200).json({
    success: true,
    data: trackingLink
  });
});

// @desc    Get tracking link by code (public - for redirect)
// @route   GET /api/tracking-links/code/:code
// @access  Public
exports.getTrackingLinkByCode = asyncHandler(async (req, res, next) => {
  const { code } = req.params;

  const trackingLink = await TrackingLink.findByCode(code);

  if (!trackingLink) {
    return res.status(404).json({
      success: false,
      message: 'Tracking link not found'
    });
  }

  // Record the click
  trackingLink.recordClick(true); // Assume unique for simplicity
  await trackingLink.save();

  res.status(200).json({
    success: true,
    data: {
      destinationUrl: trackingLink.destinationUrl,
      campaign: trackingLink.campaign,
      influencer: trackingLink.influencer
    }
  });
});

// @desc    Submit a post for tracking link
// @route   POST /api/tracking-links/:id/posts
// @access  Private
exports.submitPost = asyncHandler(async (req, res, next) => {
  const { platform, postType, postUrl, caption, postedAt } = req.body;

  const userId = checkAuth(req, res);
  if (!userId) return;

  if (!platform || !postUrl) {
    return res.status(400).json({
      success: false,
      message: 'Platform and post URL are required'
    });
  }

  const trackingLink = await TrackingLink.findById(req.params.id);

  if (!trackingLink) {
    return res.status(404).json({
      success: false,
      message: 'Tracking link not found'
    });
  }

  // Add the submitted post
  trackingLink.submittedPosts.push({
    platform,
    postType: postType || 'post',
    postUrl,
    caption,
    postedAt: postedAt || new Date(),
    status: 'pending',
    submittedAt: new Date()
  });

  await trackingLink.save();

  await trackingLink.populate([
    { path: 'campaign', select: 'name status' },
    { path: 'influencer', select: 'name email profileImage' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Post submitted successfully',
    data: trackingLink
  });
});

// @desc    Get submitted posts for a tracking link
// @route   GET /api/tracking-links/:id/posts
// @access  Private
exports.getSubmittedPosts = asyncHandler(async (req, res, next) => {
  const userId = checkAuth(req, res);
  if (!userId) return;

  const trackingLink = await TrackingLink.findById(req.params.id)
    .select('submittedPosts campaign influencer')
    .populate('submittedPosts.reviewedBy', 'name');

  if (!trackingLink) {
    return res.status(404).json({
      success: false,
      message: 'Tracking link not found'
    });
  }

  res.status(200).json({
    success: true,
    count: trackingLink.submittedPosts.length,
    data: trackingLink.submittedPosts
  });
});

// @desc    Update post status (approve/reject)
// @route   PUT /api/tracking-links/:id/posts/:postId/status
// @access  Private
exports.updatePostStatus = asyncHandler(async (req, res, next) => {
  const { status, reviewNotes } = req.body;
  const { id, postId } = req.params;

  const userId = checkAuth(req, res);
  if (!userId) return;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be: approved, rejected, or pending'
    });
  }

  const trackingLink = await TrackingLink.findById(id);

  if (!trackingLink) {
    return res.status(404).json({
      success: false,
      message: 'Tracking link not found'
    });
  }

  // Find the post
  const post = trackingLink.submittedPosts.id(postId);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Update post status
  post.status = status;
  post.reviewedAt = new Date();
  post.reviewedBy = userId;
  if (reviewNotes) post.reviewNotes = reviewNotes;

  // Recalculate total performance if approved
  if (status === 'approved') {
    trackingLink.calculateTotalPerformance();
  }

  await trackingLink.save();

  res.status(200).json({
    success: true,
    message: `Post ${status} successfully`,
    data: post
  });
});

// @desc    Update post metrics
// @route   PUT /api/tracking-links/:id/posts/:postId/metrics
// @access  Private
exports.updatePostMetrics = asyncHandler(async (req, res, next) => {
  const { metrics } = req.body;
  const { id, postId } = req.params;

  const userId = checkAuth(req, res);
  if (!userId) return;

  const trackingLink = await TrackingLink.findById(id);

  if (!trackingLink) {
    return res.status(404).json({
      success: false,
      message: 'Tracking link not found'
    });
  }

  const post = trackingLink.submittedPosts.id(postId);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Update metrics
  if (metrics) {
    post.metrics = {
      ...post.metrics,
      ...metrics
    };
  }

  // Recalculate total performance
  trackingLink.calculateTotalPerformance();

  await trackingLink.save();

  res.status(200).json({
    success: true,
    message: 'Metrics updated successfully',
    data: post
  });
});

// @desc    Delete a submitted post
// @route   DELETE /api/tracking-links/:id/posts/:postId
// @access  Private
exports.deletePost = asyncHandler(async (req, res, next) => {
  const { id, postId } = req.params;

  const userId = checkAuth(req, res);
  if (!userId) return;

  const trackingLink = await TrackingLink.findById(id);

  if (!trackingLink) {
    return res.status(404).json({
      success: false,
      message: 'Tracking link not found'
    });
  }

  const post = trackingLink.submittedPosts.id(postId);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  post.deleteOne();
  trackingLink.calculateTotalPerformance();

  await trackingLink.save();

  res.status(200).json({
    success: true,
    message: 'Post deleted successfully'
  });
});

// @desc    Update tracking link
// @route   PUT /api/tracking-links/:id
// @access  Private
exports.updateTrackingLink = asyncHandler(async (req, res, next) => {
  const { destinationUrl, notes, status, utmParams } = req.body;

  const userId = checkAuth(req, res);
  if (!userId) return;

  let trackingLink = await TrackingLink.findById(req.params.id);

  if (!trackingLink) {
    return res.status(404).json({
      success: false,
      message: 'Tracking link not found'
    });
  }

  // Update fields
  if (destinationUrl !== undefined) trackingLink.destinationUrl = destinationUrl;
  if (notes !== undefined) trackingLink.notes = notes;
  if (status) trackingLink.status = status;
  if (utmParams) {
    trackingLink.utmParams = {
      ...trackingLink.utmParams,
      ...utmParams
    };
  }

  await trackingLink.save();

  await trackingLink.populate([
    { path: 'campaign', select: 'name status' },
    { path: 'influencer', select: 'name email profileImage' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Tracking link updated successfully',
    data: trackingLink
  });
});

// @desc    Delete tracking link
// @route   DELETE /api/tracking-links/:id
// @access  Private
exports.deleteTrackingLink = asyncHandler(async (req, res, next) => {
  const userId = checkAuth(req, res);
  if (!userId) return;

  const trackingLink = await TrackingLink.findById(req.params.id);

  if (!trackingLink) {
    return res.status(404).json({
      success: false,
      message: 'Tracking link not found'
    });
  }

  // Remove tracking link reference from CampaignInfluencer
  if (trackingLink.campaignInfluencer) {
    await CampaignInfluencer.findByIdAndUpdate(
      trackingLink.campaignInfluencer,
      { $unset: { trackingLink: 1 } }
    );
  }

  await trackingLink.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Tracking link deleted successfully'
  });
});

// @desc    Get tracking stats for a campaign
// @route   GET /api/tracking-links/stats/campaign/:campaignId
// @access  Private
exports.getTrackingStats = asyncHandler(async (req, res, next) => {
  const { campaignId } = req.params;

  const userId = checkAuth(req, res);
  if (!userId) return;

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid campaign ID'
    });
  }

  const campaignObjectId = new mongoose.Types.ObjectId(campaignId);

  const stats = await TrackingLink.aggregate([
    { $match: { campaign: campaignObjectId } },
    {
      $group: {
        _id: null,
        totalLinks: { $sum: 1 },
        totalClicks: { $sum: '$clickStats.totalClicks' },
        uniqueClicks: { $sum: '$clickStats.uniqueClicks' },
        totalPosts: { $sum: { $size: '$submittedPosts' } },
        totalViews: { $sum: '$totalPerformance.totalViews' },
        totalLikes: { $sum: '$totalPerformance.totalLikes' },
        totalComments: { $sum: '$totalPerformance.totalComments' },
        totalShares: { $sum: '$totalPerformance.totalShares' },
        totalReach: { $sum: '$totalPerformance.totalReach' },
        totalImpressions: { $sum: '$totalPerformance.totalImpressions' },
        revenue: { $sum: '$totalPerformance.revenue' }
      }
    }
  ]);

  // Get posts by status
  const postsByStatus = await TrackingLink.aggregate([
    { $match: { campaign: campaignObjectId } },
    { $unwind: '$submittedPosts' },
    {
      $group: {
        _id: '$submittedPosts.status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get posts by platform
  const postsByPlatform = await TrackingLink.aggregate([
    { $match: { campaign: campaignObjectId } },
    { $unwind: '$submittedPosts' },
    {
      $group: {
        _id: '$submittedPosts.platform',
        count: { $sum: 1 },
        totalViews: { $sum: '$submittedPosts.metrics.views' },
        totalLikes: { $sum: '$submittedPosts.metrics.likes' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {
        totalLinks: 0,
        totalClicks: 0,
        uniqueClicks: 0,
        totalPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalReach: 0,
        totalImpressions: 0,
        revenue: 0
      },
      postsByStatus: postsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      postsByPlatform
    }
  });
});

// @desc    Record click on tracking link (for redirect endpoint)
// @route   POST /api/tracking-links/click/:code
// @access  Public
exports.recordClick = asyncHandler(async (req, res, next) => {
  const { code } = req.params;
  const { referrer, userAgent, ip } = req.body;

  const trackingLink = await TrackingLink.findOne({ trackingCode: code });

  if (!trackingLink) {
    return res.status(404).json({
      success: false,
      message: 'Tracking link not found'
    });
  }

  // Record click
  trackingLink.recordClick(true);
  await trackingLink.save();

  res.status(200).json({
    success: true,
    destinationUrl: trackingLink.destinationUrl
  });
});