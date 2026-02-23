const mongoose = require('mongoose');

const keywordSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide keyword name'],
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: [true, 'Please provide display name'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  // Array of influencer IDs associated with this keyword
  influencers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: Get influencer count
keywordSchema.virtual('influencerCount').get(function() {
  return this.influencers ? this.influencers.length : 0;
});

// // Index for search
// keywordSchema.index({ name: 'text', displayName: 'text' });
// keywordSchema.index({ isActive: 1 });
// keywordSchema.index({ influencers: 1 });

// Static: Get all active keywords with counts
keywordSchema.statics.getActiveKeywords = function() {
  return this.find({ isActive: true })
    .select('name displayName icon color influencers')
    .sort('displayName');
};

// Static: Get keywords for dropdown (with counts)
keywordSchema.statics.getKeywordList = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'influencers',
        localField: '_id',
        foreignField: 'keywords',
        as: 'matchedInfluencers'
      }
    },
    {
      $project: {
        name: 1,
        displayName: 1,
        icon: 1,
        color: 1,
        influencerCount: { $size: '$matchedInfluencers' }
      }
    },
    { $sort: { displayName: 1 } }
  ]);
};

// Static: Get influencers by keyword ID
keywordSchema.statics.getInfluencersByKeyword = async function(keywordId) {
  const keyword = await this.findById(keywordId)
    .populate({
      path: 'influencers',
      select: 'name profileImage platforms location status isVerified rating'
    });
  
  return keyword ? keyword.influencers : [];
};

// Static: Add influencer to keyword
keywordSchema.statics.addInfluencer = async function(keywordId, influencerId) {
  return this.findByIdAndUpdate(
    keywordId,
    { $addToSet: { influencers: influencerId } },
    { new: true }
  );
};

// Static: Remove influencer from keyword
keywordSchema.statics.removeInfluencer = async function(keywordId, influencerId) {
  return this.findByIdAndUpdate(
    keywordId,
    { $pull: { influencers: influencerId } },
    { new: true }
  );
};

// Static: Add influencer to multiple keywords
keywordSchema.statics.addInfluencerToKeywords = async function(keywordIds, influencerId) {
  return this.updateMany(
    { _id: { $in: keywordIds } },
    { $addToSet: { influencers: influencerId } }
  );
};

// Static: Remove influencer from all keywords
keywordSchema.statics.removeInfluencerFromAll = async function(influencerId) {
  return this.updateMany(
    { influencers: influencerId },
    { $pull: { influencers: influencerId } }
  );
};

module.exports = mongoose.model('Keyword', keywordSchema);