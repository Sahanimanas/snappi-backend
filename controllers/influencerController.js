const Influencer = require('../models/Influencer');
const { asyncHandler, getPagination } = require('../utils/helpers');

// @desc    Get ALL influencers without pagination (for frontend loading)
// @route   GET /api/influencers/all
// @access  Private
exports.getAllInfluencers = asyncHandler(async (req, res, next) => {
  const {
    search,
    platform,
    niche,
    status,
    minFollowers,
    maxFollowers,
    minEngagement,
    maxEngagement,
    country,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  let query = {};

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Filters
  if (platform) {
    query.platform = platform;
  }

  if (niche) {
    query.niche = { $in: [niche] };
  }

  if (status) {
    query.status = status;
  }

  if (country) {
    query.country = country;
  }

  // Follower range
  if (minFollowers || maxFollowers) {
    query.followers = {};
    if (minFollowers) query.followers.$gte = parseInt(minFollowers);
    if (maxFollowers) query.followers.$lte = parseInt(maxFollowers);
  }

  // Engagement range
  if (minEngagement || maxEngagement) {
    query.engagement = {};
    if (minEngagement) query.engagement.$gte = parseFloat(minEngagement);
    if (maxEngagement) query.engagement.$lte = parseFloat(maxEngagement);
  }

  // Sort options
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query WITHOUT pagination - get all results
  const influencers = await Influencer.find(query)
    .sort(sort)
    .populate('addedBy', 'name email')
    .lean(); // Use lean() for better performance

  res.status(200).json({
    success: true,
    count: influencers.length,
    data: influencers
  });
});

// @desc    Get all influencers with search and filters (PAGINATED)
// @route   GET /api/influencers
// @access  Private
exports.getInfluencers = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search,
    platform,
    niche,
    status,
    minFollowers,
    maxFollowers,
    minEngagement,
    maxEngagement,
    country,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  let query = {};

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Filters
  if (platform) {
    query.platform = platform;
  }

  if (niche) {
    query.niche = { $in: [niche] };
  }

  if (status) {
    query.status = status;
  }

  if (country) {
    query.country = country;
  }

  // Follower range
  if (minFollowers || maxFollowers) {
    query.followers = {};
    if (minFollowers) query.followers.$gte = parseInt(minFollowers);
    if (maxFollowers) query.followers.$lte = parseInt(maxFollowers);
  }

  // Engagement range
  if (minEngagement || maxEngagement) {
    query.engagement = {};
    if (minEngagement) query.engagement.$gte = parseFloat(minEngagement);
    if (maxEngagement) query.engagement.$lte = parseFloat(maxEngagement);
  }

  // Count total documents
  const total = await Influencer.countDocuments(query);

  // Sort options
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const influencers = await Influencer.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('addedBy', 'name email');

  // Get pagination details
  const pagination = getPagination(page, limit, total);

  res.status(200).json({
    success: true,
    count: influencers.length,
    pagination,
    data: influencers
  });
});

// @desc    Get single influencer
// @route   GET /api/influencers/:id
// @access  Private
exports.getInfluencer = asyncHandler(async (req, res, next) => {
  const influencer = await Influencer.findById(req.params.id)
    .populate('addedBy', 'name email');

  if (!influencer) {
    return res.status(404).json({
      success: false,
      message: 'Influencer not found'
    });
  }

  res.status(200).json({
    success: true,
    data: influencer
  });
});

// @desc    Create new influencer
// @route   POST /api/influencers
// @access  Private
exports.createInfluencer = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.addedBy = req.user.id;

  const influencer = await Influencer.create(req.body);

  res.status(201).json({
    success: true,
    data: influencer
  });
});

// @desc    Update influencer
// @route   PUT /api/influencers/:id
// @access  Private
exports.updateInfluencer = asyncHandler(async (req, res, next) => {
  let influencer = await Influencer.findById(req.params.id);

  if (!influencer) {
    return res.status(404).json({
      success: false,
      message: 'Influencer not found'
    });
  }

  influencer = await Influencer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: influencer
  });
});

// @desc    Delete influencer
// @route   DELETE /api/influencers/:id
// @access  Private
exports.deleteInfluencer = asyncHandler(async (req, res, next) => {
  const influencer = await Influencer.findById(req.params.id);

  if (!influencer) {
    return res.status(404).json({
      success: false,
      message: 'Influencer not found'
    });
  }

  await influencer.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get influencer statistics
// @route   GET /api/influencers/stats/overview
// @access  Private
exports.getInfluencerStats = asyncHandler(async (req, res, next) => {
  const stats = await Influencer.aggregate([
    {
      $group: {
        _id: null,
        totalInfluencers: { $sum: 1 },
        avgEngagement: { $avg: '$engagement' },
        totalReach: { $sum: '$followers' },
        availableInfluencers: {
          $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
        }
      }
    }
  ]);

  const platformStats = await Influencer.aggregate([
    {
      $group: {
        _id: '$platform',
        count: { $sum: 1 },
        avgEngagement: { $avg: '$engagement' },
        totalFollowers: { $sum: '$followers' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {},
      byPlatform: platformStats
    }
  });
});