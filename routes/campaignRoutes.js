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
  contactInfluencer,
  uploadContract,
  sendBrief,
  exportCampaigns,
  getDeliverablesByPlatform,
  getCampaignStats,
  getCampaignPerformance
} = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');
const { uploadContract: uploadMiddleware } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Static routes MUST come before dynamic :id routes
router.get('/stats/overview', getCampaignStats);
router.get('/export', exportCampaigns);
router.get('/deliverables/:platform', getDeliverablesByPlatform);

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

// Contact, contract, and brief endpoints
router.put('/:id/influencers/:influencerId/contact', contactInfluencer);
router.put('/:id/influencers/:influencerId/contract', uploadMiddleware.single('contract'), uploadContract);
router.put('/:id/influencers/:influencerId/brief', sendBrief);

module.exports = router;
