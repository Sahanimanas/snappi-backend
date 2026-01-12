const mongoose = require('mongoose');

const influencerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide influencer name'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Please provide username'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  platform: {
    type: String,
    required: [true, 'Please specify platform'],
    enum: ['instagram', 'youtube', 'tiktok', 'facebook', 'twitter', 'linkedin', 'pinterest']
  },
  profileUrl: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  followers: {
    type: Number,
    required: [true, 'Please provide follower count'],
    min: 0
  },
  engagement: {
    type: Number,
    required: [true, 'Please provide engagement rate'],
    min: 0,
    max: 100
  },
  avgViews: {
    type: Number,
    default: 0,
    min: 0
  },
  matchScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  niche: [{
    type: String,
    trim: true
  }],
  categories: [{
    type: String,
    trim: true
  }],
  country: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  language: [{
    type: String,
    trim: true
  }],
  demographics: {
    ageRange: {
      type: String,
      enum: ['13-17', '18-24', '25-34', '35-44', '45-54', '55+']
    },
    gender: {
      male: { type: Number, min: 0, max: 100 },
      female: { type: Number, min: 0, max: 100 },
      other: { type: Number, min: 0, max: 100 }
    },
    topCountries: [{
      country: String,
      percentage: { type: Number, min: 0, max: 100 }
    }]
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'unavailable'],
    default: 'available'
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  contactInfo: {
    phone: String,
    email: String,
    preferredContact: {
      type: String,
      enum: ['email', 'phone', 'platform']
    }
  },
  pricing: {
    post: Number,
    story: Number,
    video: Number,
    reel: Number
  },
  verified: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalCollaborations: {
    type: Number,
    default: 0
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for search functionality
influencerSchema.index({ name: 'text', username: 'text', niche: 'text', categories: 'text' });
influencerSchema.index({ platform: 1, followers: -1 });
influencerSchema.index({ engagement: -1 });

module.exports = mongoose.model('Influencer', influencerSchema);
