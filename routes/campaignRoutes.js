// routes/campaignRoutes.js
const express = require('express');
const {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  addInfluencerToCampaign,
  removeInfluencerFromCampaign,
  getCampaignStats,
  getCampaignPerformance
} = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Static routes MUST come before dynamic :id routes
router.get('/stats/overview', getCampaignStats);

router.route('/')
  .get(getCampaigns)
  .post(createCampaign);

router.route('/:id')
  .get(getCampaign)
  .put(updateCampaign)
  .delete(deleteCampaign);

router.get('/:id/performance', getCampaignPerformance);

router.route('/:id/influencers')
  .post(addInfluencerToCampaign);

router.delete('/:id/influencers/:influencerId', removeInfluencerFromCampaign);

module.exports = router;