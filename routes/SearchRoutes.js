const express = require('express');
const router = express.Router();
const {
  searchInfluencers,
  getAllInfluencers,
  getSearchSuggestions,
  getFilterOptions,
  getRecommendations
} = require('../controllers/searchController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   POST /api/influencers/search
// @desc    Search influencers with filters (returns all if no filters)
router.post('/search', searchInfluencers);

// @route   GET /api/influencers/all
// @desc    Get all influencers without any filters
router.get('/all', getAllInfluencers);

// @route   GET /api/influencers/search/suggestions
// @desc    Get autocomplete suggestions
router.get('/suggestions', getSearchSuggestions);

// @route   GET /api/influencers/search/filters
// @desc    Get available filter options with counts
router.get('/filters', getFilterOptions);

// @route   POST /api/influencers/search/recommendations
// @desc    Get AI-powered recommendations
router.post('/recommendations', getRecommendations);

module.exports = router;