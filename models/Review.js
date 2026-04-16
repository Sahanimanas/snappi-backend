const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: [true, 'Campaign is required']
  },
  influencer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: [true, 'Influencer is required']
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reviewer is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// One review per brand per influencer per campaign
reviewSchema.index({ campaign: 1, influencer: 1, reviewer: 1 }, { unique: true });

// After saving a review, update the influencer's average rating
reviewSchema.statics.updateInfluencerRating = async function(influencerId) {
  const result = await this.aggregate([
    { $match: { influencer: new mongoose.Types.ObjectId(influencerId) } },
    { $group: { _id: '$influencer', average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);

  const Influencer = mongoose.model('Influencer');
  if (result.length > 0) {
    await Influencer.findByIdAndUpdate(influencerId, {
      'rating.average': Math.round(result[0].average * 10) / 10,
      'rating.count': result[0].count
    });
  } else {
    await Influencer.findByIdAndUpdate(influencerId, {
      'rating.average': 0,
      'rating.count': 0
    });
  }
};

reviewSchema.post('save', async function() {
  await this.constructor.updateInfluencerRating(this.influencer);
});

reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await mongoose.model('Review').updateInfluencerRating(doc.influencer);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
