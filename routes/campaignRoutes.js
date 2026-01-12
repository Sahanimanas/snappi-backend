const express = require('express');
const {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  addInfluencerToCampaign,
  getCampaignStats,
  getCampaignPerformance
} = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getCampaigns)
  .post(createCampaign);

router.get('/stats/overview', getCampaignStats);

router.route('/:id')
  .get(getCampaign)
  .put(updateCampaign)
  .delete(deleteCampaign);

router.post('/:id/influencers', addInfluencerToCampaign);
router.get('/:id/performance', getCampaignPerformance);

module.exports = router;
