const mongoose = require('mongoose');

// Sub-schema for individual platform data
const platformSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: [true, 'Please specify platform'],
    enum: ['instagram', 'youtube', 'tiktok', 'facebook', 'twitter', 'linkedin', 'pinterest', 'snapchat', 'twitch']
  },
  username: {
    type: String,
    required: [true, 'Please provide username for this platform'],
    trim: true
  },
  profileUrl: {
    type: String,
    required: [true, 'Please provide profile URL'],
    trim: true
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
  avgLikes: {
    type: Number,
    default: 0,
    min: 0
  },
  avgComments: {
    type: Number,
    default: 0,
    min: 0
  },
  postsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  // Platform-specific pricing
  pricing: {
    post: { type: Number, default: 0 },
    story: { type: Number, default: 0 },
    video: { type: Number, default: 0 },
    reel: { type: Number, default: 0 },
    short: { type: Number, default: 0 },
    live: { type: Number, default: 0 }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const influencerSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide influencer name'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  profileImage: {
    type: String,
    default: ''
  },
  
  // Multi-platform support
  platforms: {
    type: [platformSchema],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one platform is required'
    }
  },
  
  // Reference to keywords (for reverse lookup)
  keywords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Keyword'
  }],
  
  // Location Information
  location: {
    country: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    }
  },
  
  languages: [{
    type: String,
    trim: true
  }],
  
  // Audience Demographics
  demographics: {
    primaryAgeRange: {
      type: String,
      enum: ['13-17', '18-24', '25-34', '35-44', '45-54', '55+', 'mixed']
    },
    gender: {
      male: { type: Number, min: 0, max: 100, default: 0 },
      female: { type: Number, min: 0, max: 100, default: 0 },
      other: { type: Number, min: 0, max: 100, default: 0 }
    },
    topCountries: [{
      country: String,
      percentage: { type: Number, min: 0, max: 100 }
    }]
  },
  
  // Availability Status
  status: {
    type: String,
    enum: ['available', 'busy', 'unavailable'],
    default: 'available'
  },
  
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  
  // Contact Information
  contactInfo: {
    phone: String,
    whatsapp: String,
    email: String,
    preferredContact: {
      type: String,
      enum: ['email', 'phone', 'whatsapp', 'platform'],
      default: 'email'
    }
  },
  
  // Ratings
  rating: {
    average: { type: Number, min: 0, max: 5, default: 0 },
    count: { type: Number, default: 0 }
  },
  
  totalCollaborations: {
    type: Number,
    default: 0
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============ VIRTUALS ============

// Total followers across all platforms
influencerSchema.virtual('totalFollowers').get(function() {
  if (!this.platforms || this.platforms.length === 0) return 0;
  return this.platforms.reduce((sum, p) => sum + (p.followers || 0), 0);
});

// Average engagement across all platforms
influencerSchema.virtual('avgEngagement').get(function() {
  if (!this.platforms || this.platforms.length === 0) return 0;
  const total = this.platforms.reduce((sum, p) => sum + (p.engagement || 0), 0);
  return Math.round((total / this.platforms.length) * 100) / 100;
});

// Platform with highest followers
influencerSchema.virtual('topPlatform').get(function() {
  if (!this.platforms || this.platforms.length === 0) return null;
  return this.platforms.reduce((top, p) => 
    (!top || p.followers > top.followers) ? p : top
  , null);
});

// List of platform names
influencerSchema.virtual('platformList').get(function() {
  if (!this.platforms) return [];
  return this.platforms.map(p => p.platform);
});

// Platform count
influencerSchema.virtual('platformCount').get(function() {
  return this.platforms ? this.platforms.length : 0;
});

// ============ INSTANCE METHODS ============

// Get data for a specific platform
influencerSchema.methods.getPlatformData = function(platformName) {
  return this.platforms.find(p => 
    p.platform.toLowerCase() === platformName.toLowerCase()
  );
};

// Get profile URL for a specific platform
influencerSchema.methods.getProfileUrl = function(platformName) {
  const platform = this.getPlatformData(platformName);
  return platform ? platform.profileUrl : null;
};

// Check if influencer has a specific platform
influencerSchema.methods.hasPlatform = function(platformName) {
  return this.platforms.some(p => 
    p.platform.toLowerCase() === platformName.toLowerCase()
  );
};

// Get all profile URLs as an object
influencerSchema.methods.getAllProfileUrls = function() {
  const urls = {};
  this.platforms.forEach(p => {
    urls[p.platform] = p.profileUrl;
  });
  return urls;
};

// ============ STATIC METHODS ============

// Find influencers by platform
influencerSchema.statics.findByPlatform = function(platformName) {
  return this.find({ 
    'platforms.platform': platformName.toLowerCase() 
  }).populate('keywords', 'name displayName');
};

// ============ INDEXES ============

influencerSchema.index({ name: 'text', 'platforms.username': 'text', bio: 'text' });
influencerSchema.index({ 'platforms.platform': 1, 'platforms.followers': -1 });
influencerSchema.index({ 'platforms.engagement': -1 });
influencerSchema.index({ keywords: 1 });
influencerSchema.index({ 'location.country': 1, 'location.city': 1 });
influencerSchema.index({ status: 1, isVerified: 1 });
influencerSchema.index({ createdAt: -1 });

// ============ MIDDLEWARE ============

// Ensure unique platforms per influencer
influencerSchema.pre('save', function(next) {
  if (this.platforms && this.platforms.length > 0) {
    const platformNames = this.platforms.map(p => p.platform);
    const uniquePlatforms = [...new Set(platformNames)];
    
    if (platformNames.length !== uniquePlatforms.length) {
      return next(new Error('Duplicate platforms are not allowed for the same influencer'));
    }
  }
  next();
});

module.exports = mongoose.model('Influencer', influencerSchema);