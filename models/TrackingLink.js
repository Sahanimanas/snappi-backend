// models/TrackingLink.js
const mongoose = require('mongoose');

// Schema for individual social media post submissions
const submittedPostSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['instagram', 'youtube', 'tiktok', 'facebook', 'twitter', 'linkedin', 'pinterest', 'other'],
    required: true
  },
  postType: {
    type: String,
    enum: ['post', 'story', 'reel', 'video', 'short', 'live', 'blog', 'review', 'other'],
    default: 'post'
  },
  postUrl: {
    type: String,
    required: [true, 'Post URL is required'],
    trim: true
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  postedAt: {
    type: Date
  },
  // Performance metrics for this specific post
  metrics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String
}, { _id: true, timestamps: true });

// Main TrackingLink schema
const trackingLinkSchema = new mongoose.Schema({
  // References
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
  campaignInfluencer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CampaignInfluencer'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Campaign slug for URL-friendly campaign name
  campaignSlug: {
    type: String,
    trim: true
  },
  
  // Unique tracking identifiers - NOT required because they are auto-generated in pre-validate
  trackingCode: {
    type: String,
    unique: true
  },
  trackingUrl: {
    type: String
  },
  shortUrl: {
    type: String
  },
  
  // UTM Parameters for link tracking
  utmParams: {
    source: { type: String, default: 'influencer' },
    medium: { type: String, default: 'social' },
    campaign: String,
    content: String,
    term: String
  },
  
  // Destination URL (where the tracking link redirects to)
  destinationUrl: {
    type: String,
    trim: true
  },
  
  // All submitted posts from the influencer
  submittedPosts: [submittedPostSchema],
  
  // Aggregated performance across all posts
  totalPerformance: {
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    totalShares: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 }
  },
  
  // Link click tracking
  clickStats: {
    totalClicks: { type: Number, default: 0 },
    uniqueClicks: { type: Number, default: 0 },
    lastClickedAt: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'expired', 'completed'],
    default: 'active'
  },
  
  // Expiration
  expiresAt: {
    type: Date
  },
  
  // Notes
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: Count of approved posts
trackingLinkSchema.virtual('approvedPostsCount').get(function() {
  if (!this.submittedPosts) return 0;
  return this.submittedPosts.filter(p => p.status === 'approved').length;
});

// Virtual: Count of pending posts
trackingLinkSchema.virtual('pendingPostsCount').get(function() {
  if (!this.submittedPosts) return 0;
  return this.submittedPosts.filter(p => p.status === 'pending').length;
});

// Helper function to create URL-friendly slug from campaign name
function createSlug(name) {
  if (!name) return 'campaign';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .substring(0, 50);         // Limit length
}

// Pre-validate: Generate tracking code and URL BEFORE validation runs
trackingLinkSchema.pre('validate', function(next) {
  // Generate unique tracking code
  if (!this.trackingCode) {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    this.trackingCode = `${timestamp}${randomStr}`.toUpperCase();
  }
  
  // Generate tracking URL with campaign slug
  if (!this.trackingUrl) {
    const baseUrl = process.env.TRACKING_BASE_URL
    const slug = this.campaignSlug || 'campaign';
    // URL format: baseUrl/campaign-name/TRACKINGCODE
    this.trackingUrl = `${baseUrl}/${slug}/${this.trackingCode}`;
  }
  
  next();
});

// Static method to create slug from campaign name (can be used by controller)
trackingLinkSchema.statics.createSlug = createSlug;

// Method: Calculate aggregated performance from all approved posts
trackingLinkSchema.methods.calculateTotalPerformance = function() {
  const approvedPosts = this.submittedPosts.filter(p => p.status === 'approved');
  
  this.totalPerformance = {
    totalViews: approvedPosts.reduce((sum, p) => sum + (p.metrics.views || 0), 0),
    totalLikes: approvedPosts.reduce((sum, p) => sum + (p.metrics.likes || 0), 0),
    totalComments: approvedPosts.reduce((sum, p) => sum + (p.metrics.comments || 0), 0),
    totalShares: approvedPosts.reduce((sum, p) => sum + (p.metrics.shares || 0), 0),
    totalClicks: approvedPosts.reduce((sum, p) => sum + (p.metrics.clicks || 0), 0),
    totalReach: approvedPosts.reduce((sum, p) => sum + (p.metrics.reach || 0), 0),
    totalImpressions: approvedPosts.reduce((sum, p) => sum + (p.metrics.impressions || 0), 0),
    totalConversions: this.totalPerformance.totalConversions || 0,
    revenue: this.totalPerformance.revenue || 0,
    engagementRate: this.totalPerformance.engagementRate || 0
  };
  
  return this;
};

// Method: Record a link click
trackingLinkSchema.methods.recordClick = function(isUnique = false) {
  this.clickStats.totalClicks += 1;
  if (isUnique) {
    this.clickStats.uniqueClicks += 1;
  }
  this.clickStats.lastClickedAt = new Date();
  return this;
};

// Static: Find by tracking code
trackingLinkSchema.statics.findByCode = function(code) {
  return this.findOne({ trackingCode: code })
    .populate('campaign', 'name status startDate endDate')
    .populate('influencer', 'name email profileImage platforms');
};

// Static: Get all tracking links for a campaign
trackingLinkSchema.statics.findByCampaign = function(campaignId) {
  return this.find({ campaign: campaignId })
    .populate('influencer', 'name email profileImage platforms')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('TrackingLink', trackingLinkSchema);