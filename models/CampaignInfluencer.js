const mongoose = require('mongoose');

const campaignInfluencerSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  influencer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: true
  },
  status: {
    type: String,
    enum: ['invited', 'contacted', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'],
    default: 'invited'
  },
  contacted: {
    type: Boolean,
    default: false
  },
  contactedAt: {
    type: Date
  },
  contactMethod: {
    type: String,
    enum: ['email', 'whatsapp', 'platform_dm', 'phone', 'other']
  },
  contractSigned: {
    type: Boolean,
    default: false
  },
  contractSignedAt: {
    type: Date
  },
  contractUrl: {
    type: String,
    trim: true
  },
  briefSent: {
    type: Boolean,
    default: false
  },
  briefSentAt: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  compensation: {
    amount: {
      type: Number,
      default: 0
    },
    type: {
      type: String,
      enum: ['monetary', 'product', 'both', 'affiliate']
    },
    paid: {
      type: Boolean,
      default: false
    }
  },
  trackingLink: {
    type: String,
    trim: true
  },
  deliverables: [{
    type: {
      type: String,
      enum: ['post', 'story', 'reel', 'video', 'blog', 'review']
    },
    url: String,
    submittedAt: Date,
    approved: {
      type: Boolean,
      default: false
    },
    approvedAt: Date
  }],
  performance: {
    reach: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    },
    engagement: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    sales: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate entries
campaignInfluencerSchema.index({ campaign: 1, influencer: 1 }, { unique: true });

// Index for queries
campaignInfluencerSchema.index({ campaign: 1, status: 1 });
campaignInfluencerSchema.index({ influencer: 1, status: 1 });

module.exports = mongoose.model('CampaignInfluencer', campaignInfluencerSchema);
