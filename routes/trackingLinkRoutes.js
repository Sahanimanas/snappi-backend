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
  getSubmittedPosts,
  updatePostStatus,
  updatePostMetrics,
  deletePost,
  updateTrackingLink,
  deleteTrackingLink,
  getTrackingStats,
  recordClick
} = require('../controllers/trackingLinkController');

// Apply protect middleware to all routes
router.use(protect);

// Generate tracking link
router.post('/generate', generateTrackingLink);

// Get tracking links for a campaign
router.get('/campaign/:campaignId', getCampaignTrackingLinks);

// Get tracking stats for a campaign
router.get('/stats/campaign/:campaignId', getTrackingStats);

// Get tracking link by code (for redirects) - could be public if needed
router.get('/code/:code', getTrackingLinkByCode);

// Record click (for redirect endpoint) - could be public if needed
router.post('/click/:code', recordClick);

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