const express = require('express');
const router = express.Router();
const {
  getKeywords,
  getKeywordList,
  getKeyword,
  getInfluencersByKeyword,
  createKeyword,
  updateKeyword,
  deleteKeyword,
  assignInfluencer,
  removeInfluencer,
  bulkAssignInfluencers,
  getKeywordStats,
  bulkCreateKeywords
} = require('../controllers/keywordController');

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getKeywords);
router.get('/list', getKeywordList);
router.get('/stats', protect, authorize('admin'), getKeywordStats);
router.get('/:id', getKeyword);
router.get('/:id/influencers', getInfluencersByKeyword);  // Main filter endpoint

// Protected routes (Admin only)
router.post('/', protect, authorize('admin'), createKeyword);
router.post('/bulk', protect, authorize('admin'), bulkCreateKeywords);
router.put('/:id', protect, authorize('admin'), updateKeyword);
router.delete('/:id', protect, authorize('admin'), deleteKeyword);

// Influencer assignment
router.post('/:id/influencers/:influencerId', protect, authorize('admin'), assignInfluencer);
router.delete('/:id/influencers/:influencerId', protect, authorize('admin'), removeInfluencer);
router.post('/:id/influencers/bulk', protect, authorize('admin'), bulkAssignInfluencers);

module.exports = router;