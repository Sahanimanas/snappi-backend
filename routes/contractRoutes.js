const express = require('express');
const {
  getContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
  sendContract,
  getContractByToken,
  respondToContract,
  getContractStatus,
  getContractsByCampaign
} = require('../controllers/contractController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes (no auth required)
router.get('/respond/:token', getContractByToken);
router.post('/respond/:token', respondToContract);

// Protected routes
router.use(protect);

router.route('/')
  .get(getContracts)
  .post(createContract);

router.route('/:id')
  .get(getContract)
  .put(updateContract)
  .delete(deleteContract);

router.post('/:id/send', sendContract);

router.get('/status/:influencerId/:campaignId', getContractStatus);
router.get('/campaign/:campaignId', getContractsByCampaign);

module.exports = router;
