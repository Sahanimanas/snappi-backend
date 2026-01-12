const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide campaign name'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  objective: {
    type: String,
    enum: ['brand_awareness', 'increase_sales', 'engagement', 'lead_generation', 'traffic'],
    required: [true, 'Please specify campaign objective']
  },
  campaignType: {
    type: String,
    enum: ['sponsored_post', 'product_review', 'giveaway', 'brand_ambassador', 'affiliate'],
    required: [true, 'Please specify campaign type']
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  budget: {
    total: {
      type: Number,
      required: [true, 'Please provide total budget'],
      min: 0
    },
    spent: {
      type: Number,
      default: 0,
      min: 0
    },
    remaining: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  targetPlatforms: [{
    type: String,
    enum: ['instagram', 'youtube', 'tiktok', 'facebook', 'twitter', 'linkedin', 'pinterest']
  }],
  demographics: {
    ageRange: [{
      type: String,
      enum: ['13-17', '18-24', '25-34', '35-44', '45-54', '55+']
    }],
    gender: [{
      type: String,
      enum: ['male', 'female', 'all']
    }],
    location: {
      countries: [String],
      cities: [String]
    }
  },
  compensationType: {
    type: String,
    enum: ['monetary', 'product', 'both', 'affiliate'],
    default: 'monetary'
  },
  kpis: {
    impressions: { type: Boolean, default: false },
    engagement: { type: Boolean, default: false },
    clicks: { type: Boolean, default: false },
    conversions: { type: Boolean, default: false },
    sales: { type: Boolean, default: false },
    reach: { type: Boolean, default: false }
  },
  deliverables: [{
    type: {
      type: String,
      enum: ['post', 'story', 'reel', 'video', 'blog', 'review']
    },
    quantity: Number,
    description: String
  }],
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  contract: {
    templateUsed: Boolean,
    fileUrl: String,
    uploadedAt: Date
  },
  performance: {
    totalReach: {
      type: Number,
      default: 0
    },
    totalEngagement: {
      type: Number,
      default: 0
    },
    totalClicks: {
      type: Number,
      default: 0
    },
    totalConversions: {
      type: Number,
      default: 0
    },
    roi: {
      type: Number,
      default: 0
    }
  },
  influencers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Pre-save hook to calculate remaining budget
campaignSchema.pre('save', function(next) {
  if (this.budget.total && this.budget.spent !== undefined) {
    this.budget.remaining = this.budget.total - this.budget.spent;
  }
  next();
});

// Index for efficient queries
campaignSchema.index({ status: 1, createdBy: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
