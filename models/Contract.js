const mongoose = require('mongoose');
const crypto = require('crypto');

const sentContractSchema = new mongoose.Schema({
  influencer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: true
  },
  influencerEmail: {
    type: String,
    required: true
  },
  influencerName: {
    type: String
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  campaignName: {
    type: String
  },
  responseToken: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'connected'],
    default: 'pending'
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
});

const contractSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide contract title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Please provide contract content'],
    maxlength: [50000, 'Content cannot exceed 50000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sentContracts: [sentContractSchema]
}, {
  timestamps: true
});

// Generate unique response token before saving
sentContractSchema.pre('save', function(next) {
  if (!this.responseToken) {
    this.responseToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Index for efficient queries
contractSchema.index({ createdBy: 1, createdAt: -1 });
contractSchema.index({ 'sentContracts.responseToken': 1 });
contractSchema.index({ 'sentContracts.influencer': 1 });
contractSchema.index({ 'sentContracts.campaign': 1 });

module.exports = mongoose.model('Contract', contractSchema);
