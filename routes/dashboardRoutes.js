const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
  getDashboardOverview,
  getDashboardStats,
  getRecentCampaigns,
  getTopPerformingInfluencers,
  getInfluencerDashboard,
  getDashboardAnalytics
} = require('../controllers/dashboardController');

// All routes are protected
router.use(protect);

// ============================================
// MAIN DASHBOARD ROUTES
// ============================================

// @route   GET /api/dashboard
// @desc    Get complete dashboard overview (stats, recent campaigns, top influencers)
router.get('/', getDashboardOverview);

// @route   GET /api/dashboard/stats
// @desc    Get dashboard stats only (lightweight)
router.get('/stats', getDashboardStats);

// @route   GET /api/dashboard/campaigns/recent
// @desc    Get recent campaigns for dashboard
// @query   limit (default: 5)
router.get('/campaigns/recent', getRecentCampaigns);

// @route   GET /api/dashboard/influencers/top
// @desc    Get top performing influencers (sorted by engagement by default)
// @query   limit (default: 5), sortBy (engagement|followers|matchScore)
router.get('/influencers/top', getTopPerformingInfluencers);

// @route   GET /api/dashboard/analytics
// @desc    Get analytics data for charts
// @query   period (7days|30days|90days|12months)
router.get('/analytics', getDashboardAnalytics);

// @route   GET /api/dashboard/influencer
// @desc    Get dashboard for influencer users
router.get('/influencer', getInfluencerDashboard);

module.exports = router;