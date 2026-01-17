const express = require('express');
const {
  register, login, logout, getMe, updateDetails, updatePassword,
  saveInfluencer, removeSavedInfluencer, getSavedInfluencers
} = require('../controllers/userController');
const { protectUser } = require('../middleware/auth');

const router = express.Router();

// Public
router.post('/register', register);
router.post('/login', login);

// User auth
router.get('/logout', protectUser, logout);
router.get('/me', protectUser, getMe);
router.put('/updatedetails', protectUser, updateDetails);
router.put('/updatepassword', protectUser, updatePassword);

// Saved influencers
router.get('/saved-influencers', protectUser, getSavedInfluencers);
router.post('/saved-influencers/:influencerId', protectUser, saveInfluencer);
router.delete('/saved-influencers/:influencerId', protectUser, removeSavedInfluencer);

module.exports = router;