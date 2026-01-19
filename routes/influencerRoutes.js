const express = require('express');
const router = express.Router();
const {
  getInfluencers,
  getInfluencer,
  createInfluencer,
  updateInfluencer,
  deleteInfluencer,
  addPlatform,
  updatePlatform,
  removePlatform,
  assignKeywords,
  removeKeywords,
  getTopByEngagement,
  getInfluencerStats,
  searchInfluencers
} = require('../controllers/influencerController');

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getInfluencers);
router.get('/top/engagement', getTopByEngagement);
router.get('/stats', protect, authorize('admin'), getInfluencerStats);
router.get('/:id', getInfluencer);

// Protected routes (Admin only)
router.post('/', protect, authorize('admin'), createInfluencer);
router.post('/search', searchInfluencers);
router.put('/:id', protect, authorize('admin'), updateInfluencer);
router.delete('/:id', protect, authorize('admin'), deleteInfluencer);

// Platform management
router.post('/:id/platforms', protect, authorize('admin'), addPlatform);
router.put('/:id/platforms/:platformId', protect, authorize('admin'), updatePlatform);
router.delete('/:id/platforms/:platformId', protect, authorize('admin'), removePlatform);

// Keyword assignment
router.post('/:id/keywords', protect, authorize('admin'), assignKeywords);
router.delete('/:id/keywords', protect, authorize('admin'), removeKeywords);

module.exports = router;