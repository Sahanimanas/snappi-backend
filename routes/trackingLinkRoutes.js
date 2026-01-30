// routes/trackingLinkRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
  generateTrackingLink,
  getCampaignTrackingLinks,
  getTrackingLink,
  getTrackingLinkByCode,
  submitPost,
  submitPostByCode,
  getSubmittedPosts,
  updatePostStatus,
  updatePostMetrics,
  deletePost,
  updateTrackingLink,
  deleteTrackingLink,
  getTrackingStats,
  getOverallStats,
  recordClick
} = require('../controllers/trackingLinkController');

// ============ PUBLIC ROUTES (no auth required) ============
// These are used for tracking link redirects and influencer submissions

// Get tracking link by code (for submission page)
router.get('/code/:code', getTrackingLinkByCode);

// Submit post by tracking code (for influencers - public)
router.post('/submit/:code', submitPostByCode);

// Record click (for redirect endpoint)
router.post('/click/:code', recordClick);

// ============ PROTECTED ROUTES (auth required) ============
router.use(protect);

// Generate tracking link
router.post('/generate', generateTrackingLink);

// Get tracking links for a campaign
router.get('/campaign/:campaignId', getCampaignTrackingLinks);

// Get tracking stats for a campaign
router.get('/stats/campaign/:campaignId', getTrackingStats);

// Get overall tracking stats across all campaigns
router.get('/stats/overall', getOverallStats);

// Single tracking link operations
router.get('/:id', getTrackingLink);
router.put('/:id', updateTrackingLink);
router.delete('/:id', deleteTrackingLink);

// Post submissions for tracking link
router.post('/:id/posts', submitPost);
router.get('/:id/posts', getSubmittedPosts);

// Post status and metrics
router.put('/:id/posts/:postId/status', updatePostStatus);
router.put('/:id/posts/:postId/metrics', updatePostMetrics);
router.delete('/:id/posts/:postId', deletePost);

module.exports = router;