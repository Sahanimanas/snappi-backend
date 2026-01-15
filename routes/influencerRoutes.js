const express = require('express');
const router = express.Router();
const {
  getAllInfluencers,  // NEW: Import the new controller method
  getInfluencers,
  getInfluencer,
  createInfluencer,
  updateInfluencer,
  deleteInfluencer,
  getInfluencerStats
} = require('../controllers/influencerController');
const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// IMPORTANT: Place specific routes BEFORE parameterized routes
router.route('/all').get(getAllInfluencers);  // NEW ROUTE - must be before /:id
router.route('/stats/overview').get(getInfluencerStats);

router.route('/')
  .get(getInfluencers)
  .post(createInfluencer);

router.route('/:id')
  .get(getInfluencer)
  .put(updateInfluencer)
  .delete(deleteInfluencer);

module.exports = router;