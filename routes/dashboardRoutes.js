const express = require('express');
const {
  getDashboard,
  getInfluencerDashboard
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', getDashboard);
router.get('/influencers', getInfluencerDashboard);

module.exports = router;
