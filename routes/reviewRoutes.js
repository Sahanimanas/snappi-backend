const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Review = require('../models/Review');

// All routes require authentication
router.use(protect);

// Create or update a review
router.post('/', async (req, res) => {
  try {
    const { campaign, influencer, rating, comment } = req.body;

    if (!campaign || !influencer || !rating) {
      return res.status(400).json({ success: false, message: 'Campaign, influencer, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const existing = await Review.findOne({ campaign, influencer, reviewer: req.user._id });

    if (existing) {
      existing.rating = rating;
      existing.comment = comment || '';
      await existing.save();
      return res.status(200).json({ success: true, data: existing, message: 'Review updated' });
    }

    const review = await Review.create({
      campaign,
      influencer,
      reviewer: req.user._id,
      rating,
      comment: comment || ''
    });

    res.status(201).json({ success: true, data: review, message: 'Review created' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You already reviewed this influencer for this campaign' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get reviews for an influencer
router.get('/influencer/:influencerId', async (req, res) => {
  try {
    const reviews = await Review.find({ influencer: req.params.influencerId })
      .populate('reviewer', 'name')
      .populate('campaign', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get my review for a specific influencer in a campaign
router.get('/my/:campaignId/:influencerId', async (req, res) => {
  try {
    const review = await Review.findOne({
      campaign: req.params.campaignId,
      influencer: req.params.influencerId,
      reviewer: req.user._id
    });
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a review
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, reviewer: req.user._id });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    await Review.findOneAndDelete({ _id: req.params.id });
    res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
