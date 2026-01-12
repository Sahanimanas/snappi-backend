const express = require('express');
const {
  getInfluencers,
  getInfluencer,
  createInfluencer,
  updateInfluencer,
  deleteInfluencer,
  getInfluencerStats
} = require('../controllers/influencerController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getInfluencers)
  .post(createInfluencer);

router.get('/stats/overview', getInfluencerStats);

router.route('/:id')
  .get(getInfluencer)
  .put(updateInfluencer)
  .delete(deleteInfluencer);

module.exports = router;
