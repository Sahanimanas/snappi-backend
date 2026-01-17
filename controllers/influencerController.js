const Influencer = require('../models/Influencer');
const Keyword = require('../models/Keyword');
const asyncHandler = require('express-async-handler');

// @desc    Get all influencers with filters
// @route   GET /api/influencers
// @access  Public
const getInfluencers = asyncHandler(async (req, res) => {
  const {
    search,
    platform,
    keywords,
    minFollowers,
    maxFollowers,
    minEngagement,
    maxEngagement,
    country,
    city,
    status,
    isVerified,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10
  } = req.query;

  const query = {};

  // Text search
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { 'platforms.username': new RegExp(search, 'i') },
      { bio: new RegExp(search, 'i') }
    ];
  }

  // Platform filter
  if (platform) {
    query['platforms.platform'] = platform.toLowerCase();
  }

  // Keywords filter (comma-separated IDs)
  if (keywords) {
    const keywordIds = keywords.split(',').map(id => id.trim());
    query.keywords = { $in: keywordIds };
  }

  // Follower range
  if (minFollowers || maxFollowers) {
    query['platforms.followers'] = {};
    if (minFollowers) query['platforms.followers'].$gte = parseInt(minFollowers);
    if (maxFollowers) query['platforms.followers'].$lte = parseInt(maxFollowers);
  }

  // Engagement range
  if (minEngagement || maxEngagement) {
    query['platforms.engagement'] = {};
    if (minEngagement) query['platforms.engagement'].$gte = parseFloat(minEngagement);
    if (maxEngagement) query['platforms.engagement'].$lte = parseFloat(maxEngagement);
  }

  // Location filters
  if (country) query['location.country'] = new RegExp(country, 'i');
  if (city) query['location.city'] = new RegExp(city, 'i');

  // Status filter
  if (status) query.status = status;

  // Verified filter
  if (isVerified !== undefined) query.isVerified = isVerified === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Handle sorting
  let sort = {};
  if (sortBy === 'followers') {
    sort = { 'platforms.followers': sortOrder === 'asc' ? 1 : -1 };
  } else if (sortBy === 'engagement') {
    sort = { 'platforms.engagement': sortOrder === 'asc' ? 1 : -1 };
  } else {
    sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  }

  const [influencers, total] = await Promise.all([
    Influencer.find(query)
      .populate('keywords', 'name displayName icon color')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Influencer.countDocuments(query)
  ]);

  // Add computed fields
  const influencersWithComputed = influencers.map(inf => ({
    ...inf.toObject(),
    totalFollowers: inf.totalFollowers,
    avgEngagement: inf.avgEngagement,
    platformList: inf.platformList,
    platformCount: inf.platformCount
  }));

  res.status(200).json({
    success: true,
    count: influencers.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: influencersWithComputed
  });
});

// @desc    Get single influencer
// @route   GET /api/influencers/:id
// @access  Public
const getInfluencer = asyncHandler(async (req, res) => {
  const influencer = await Influencer.findById(req.params.id)
    .populate('keywords', 'name displayName icon color')
    .populate('addedBy', 'name email');

  if (!influencer) {
    res.status(404);
    throw new Error('Influencer not found');
  }

  res.status(200).json({
    success: true,
    data: {
      ...influencer.toObject(),
      totalFollowers: influencer.totalFollowers,
      avgEngagement: influencer.avgEngagement,
      platformList: influencer.platformList,
      allProfileUrls: influencer.getAllProfileUrls()
    }
  });
});

// @desc    Create new influencer with keyword assignments
// @route   POST /api/influencers
// @access  Private/Admin
const createInfluencer = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    profileImage,
    platforms,
    keywordIds,  // Array of keyword IDs to assign
    location,
    languages,
    demographics,
    status,
    bio,
    contactInfo,
    notes
  } = req.body;

  // Validate required fields
  if (!name || !platforms || platforms.length === 0) {
    res.status(400);
    throw new Error('Name and at least one platform are required');
  }

  // Validate platforms
  for (const platform of platforms) {
    if (!platform.platform || !platform.username || !platform.profileUrl || 
        platform.followers === undefined || platform.engagement === undefined) {
      res.status(400);
      throw new Error('Each platform must have: platform, username, profileUrl, followers, and engagement');
    }
  }

  // Check for duplicate platforms
  const platformNames = platforms.map(p => p.platform.toLowerCase());
  if (new Set(platformNames).size !== platformNames.length) {
    res.status(400);
    throw new Error('Duplicate platforms are not allowed');
  }

  // Validate keywords if provided
  let validKeywordIds = [];
  if (keywordIds && keywordIds.length > 0) {
    const keywords = await Keyword.find({ 
      _id: { $in: keywordIds }, 
      isActive: true 
    });
    
    if (keywords.length !== keywordIds.length) {
      res.status(400);
      throw new Error('One or more keyword IDs are invalid or inactive');
    }
    validKeywordIds = keywordIds;
  }

  // Create influencer
  const influencer = await Influencer.create({
    name,
    email,
    profileImage,
    platforms: platforms.map(p => ({
      ...p,
      platform: p.platform.toLowerCase()
    })),
    keywords: validKeywordIds,
    location,
    languages,
    demographics,
    status,
    bio,
    contactInfo,
    notes,
    addedBy: req.user._id
  });

  // Add influencer to each keyword's influencers array
  if (validKeywordIds.length > 0) {
    await Keyword.updateMany(
      { _id: { $in: validKeywordIds } },
      { $addToSet: { influencers: influencer._id } }
    );
  }

  await influencer.populate('keywords', 'name displayName icon color');

  res.status(201).json({
    success: true,
    message: 'Influencer created successfully',
    data: {
      ...influencer.toObject(),
      totalFollowers: influencer.totalFollowers,
      avgEngagement: influencer.avgEngagement,
      platformList: influencer.platformList
    }
  });
});

// @desc    Update influencer
// @route   PUT /api/influencers/:id
// @access  Private/Admin
const updateInfluencer = asyncHandler(async (req, res) => {
  let influencer = await Influencer.findById(req.params.id);

  if (!influencer) {
    res.status(404);
    throw new Error('Influencer not found');
  }

  const { keywordIds, ...updateData } = req.body;

  // Handle keyword updates if provided
  if (keywordIds !== undefined) {
    // Get old keywords
    const oldKeywordIds = influencer.keywords.map(k => k.toString());
    
    // Validate new keywords
    if (keywordIds.length > 0) {
      const keywords = await Keyword.find({ 
        _id: { $in: keywordIds }, 
        isActive: true 
      });
      
      if (keywords.length !== keywordIds.length) {
        res.status(400);
        throw new Error('One or more keyword IDs are invalid or inactive');
      }
    }

    // Remove influencer from old keywords
    await Keyword.updateMany(
      { _id: { $in: oldKeywordIds } },
      { $pull: { influencers: influencer._id } }
    );

    // Add influencer to new keywords
    if (keywordIds.length > 0) {
      await Keyword.updateMany(
        { _id: { $in: keywordIds } },
        { $addToSet: { influencers: influencer._id } }
      );
    }

    updateData.keywords = keywordIds;
  }

  // Normalize platform names if platforms are being updated
  if (updateData.platforms) {
    updateData.platforms = updateData.platforms.map(p => ({
      ...p,
      platform: p.platform.toLowerCase()
    }));
  }

  influencer = await Influencer.findByIdAndUpdate(
    req.params.id,
    { ...updateData, updatedBy: req.user._id },
    { new: true, runValidators: true }
  ).populate('keywords', 'name displayName icon color');

  res.status(200).json({
    success: true,
    message: 'Influencer updated successfully',
    data: influencer
  });
});

// @desc    Delete influencer
// @route   DELETE /api/influencers/:id
// @access  Private/Admin
const deleteInfluencer = asyncHandler(async (req, res) => {
  const influencer = await Influencer.findById(req.params.id);

  if (!influencer) {
    res.status(404);
    throw new Error('Influencer not found');
  }

  // Remove influencer from all keywords
  await Keyword.updateMany(
    { influencers: influencer._id },
    { $pull: { influencers: influencer._id } }
  );

  await influencer.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Influencer deleted successfully',
    data: {}
  });
});

// @desc    Add platform to influencer
// @route   POST /api/influencers/:id/platforms
// @access  Private/Admin
const addPlatform = asyncHandler(async (req, res) => {
  const { platform, username, profileUrl, followers, engagement, avgViews, verified, pricing } = req.body;

  if (!platform || !username || !profileUrl || followers === undefined || engagement === undefined) {
    res.status(400);
    throw new Error('Platform, username, profileUrl, followers, and engagement are required');
  }

  const influencer = await Influencer.findById(req.params.id);

  if (!influencer) {
    res.status(404);
    throw new Error('Influencer not found');
  }

  if (influencer.hasPlatform(platform)) {
    res.status(400);
    throw new Error(`${platform} platform already exists for this influencer`);
  }

  influencer.platforms.push({
    platform: platform.toLowerCase(),
    username,
    profileUrl,
    followers,
    engagement,
    avgViews: avgViews || 0,
    verified: verified || false,
    pricing: pricing || {},
    lastUpdated: new Date()
  });

  influencer.updatedBy = req.user._id;
  await influencer.save();
  await influencer.populate('keywords', 'name displayName icon color');

  res.status(200).json({
    success: true,
    message: `${platform} platform added successfully`,
    data: influencer
  });
});

// @desc    Update platform for influencer
// @route   PUT /api/influencers/:id/platforms/:platformId
// @access  Private/Admin
const updatePlatform = asyncHandler(async (req, res) => {
  const influencer = await Influencer.findById(req.params.id);

  if (!influencer) {
    res.status(404);
    throw new Error('Influencer not found');
  }

  const platformIndex = influencer.platforms.findIndex(
    p => p._id.toString() === req.params.platformId
  );

  if (platformIndex === -1) {
    res.status(404);
    throw new Error('Platform not found');
  }

  Object.keys(req.body).forEach(key => {
    if (key !== '_id' && key !== 'platform') {
      influencer.platforms[platformIndex][key] = req.body[key];
    }
  });

  influencer.platforms[platformIndex].lastUpdated = new Date();
  influencer.updatedBy = req.user._id;
  await influencer.save();
  await influencer.populate('keywords', 'name displayName icon color');

  res.status(200).json({
    success: true,
    message: 'Platform updated successfully',
    data: influencer
  });
});

// @desc    Remove platform from influencer
// @route   DELETE /api/influencers/:id/platforms/:platformId
// @access  Private/Admin
const removePlatform = asyncHandler(async (req, res) => {
  const influencer = await Influencer.findById(req.params.id);

  if (!influencer) {
    res.status(404);
    throw new Error('Influencer not found');
  }

  if (influencer.platforms.length <= 1) {
    res.status(400);
    throw new Error('Cannot remove the last platform');
  }

  const platformIndex = influencer.platforms.findIndex(
    p => p._id.toString() === req.params.platformId
  );

  if (platformIndex === -1) {
    res.status(404);
    throw new Error('Platform not found');
  }

  const removedPlatform = influencer.platforms[platformIndex].platform;
  influencer.platforms.splice(platformIndex, 1);
  influencer.updatedBy = req.user._id;
  await influencer.save();

  res.status(200).json({
    success: true,
    message: `${removedPlatform} platform removed successfully`,
    data: influencer
  });
});

// @desc    Assign keywords to influencer
// @route   POST /api/influencers/:id/keywords
// @access  Private/Admin
const assignKeywords = asyncHandler(async (req, res) => {
  const { keywordIds } = req.body;

  if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
    res.status(400);
    throw new Error('Please provide keywordIds array');
  }

  const influencer = await Influencer.findById(req.params.id);

  if (!influencer) {
    res.status(404);
    throw new Error('Influencer not found');
  }

  // Validate keywords
  const keywords = await Keyword.find({ 
    _id: { $in: keywordIds }, 
    isActive: true 
  });

  if (keywords.length !== keywordIds.length) {
    res.status(400);
    throw new Error('One or more keyword IDs are invalid or inactive');
  }

  let addedCount = 0;

  for (const keywordId of keywordIds) {
    // Add to influencer if not already there
    if (!influencer.keywords.includes(keywordId)) {
      influencer.keywords.push(keywordId);
      addedCount++;
    }

    // Add to keyword's influencers
    await Keyword.findByIdAndUpdate(
      keywordId,
      { $addToSet: { influencers: influencer._id } }
    );
  }

  influencer.updatedBy = req.user._id;
  await influencer.save();
  await influencer.populate('keywords', 'name displayName icon color');

  res.status(200).json({
    success: true,
    message: `${addedCount} keyword(s) assigned successfully`,
    data: influencer
  });
});

// @desc    Remove keywords from influencer
// @route   DELETE /api/influencers/:id/keywords
// @access  Private/Admin
const removeKeywords = asyncHandler(async (req, res) => {
  const { keywordIds } = req.body;

  if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
    res.status(400);
    throw new Error('Please provide keywordIds array');
  }

  const influencer = await Influencer.findById(req.params.id);

  if (!influencer) {
    res.status(404);
    throw new Error('Influencer not found');
  }

  // Remove from influencer's keywords
  influencer.keywords = influencer.keywords.filter(
    k => !keywordIds.includes(k.toString())
  );

  // Remove from each keyword's influencers
  await Keyword.updateMany(
    { _id: { $in: keywordIds } },
    { $pull: { influencers: influencer._id } }
  );

  influencer.updatedBy = req.user._id;
  await influencer.save();
  await influencer.populate('keywords', 'name displayName icon color');

  res.status(200).json({
    success: true,
    message: 'Keywords removed successfully',
    data: influencer
  });
});

// @desc    Get top influencers by engagement
// @route   GET /api/influencers/top/engagement
// @access  Public
const getTopByEngagement = asyncHandler(async (req, res) => {
  const { platform, limit = 10 } = req.query;

  const matchStage = platform 
    ? { 'platforms.platform': platform.toLowerCase() }
    : {};

  const influencers = await Influencer.aggregate([
    { $match: matchStage },
    { $unwind: '$platforms' },
    ...(platform ? [{ $match: { 'platforms.platform': platform.toLowerCase() } }] : []),
    { $sort: { 'platforms.engagement': -1 } },
    { $limit: parseInt(limit) },
    {
      $lookup: {
        from: 'keywords',
        localField: 'keywords',
        foreignField: '_id',
        as: 'keywordDetails'
      }
    }
  ]);

  res.status(200).json({
    success: true,
    count: influencers.length,
    data: influencers
  });
});

// @desc    Get influencer statistics
// @route   GET /api/influencers/stats
// @access  Private/Admin
const getInfluencerStats = asyncHandler(async (req, res) => {
  const [
    totalInfluencers,
    verifiedCount,
    platformStats,
    statusStats
  ] = await Promise.all([
    Influencer.countDocuments(),
    Influencer.countDocuments({ isVerified: true }),
    Influencer.aggregate([
      { $unwind: '$platforms' },
      {
        $group: {
          _id: '$platforms.platform',
          count: { $sum: 1 },
          totalFollowers: { $sum: '$platforms.followers' },
          avgEngagement: { $avg: '$platforms.engagement' }
        }
      },
      { $sort: { count: -1 } }
    ]),
    Influencer.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalInfluencers,
      verifiedCount,
      platformStats,
      statusBreakdown: statusStats
    }
  });
});
// Add this to influencerController.js

// @desc    Advanced search influencers
// @route   POST /api/influencers/search
// @access  Public
exports.searchInfluencers = async (req, res) => {
  try {
    const {
      search, platform, keywords, minFollowers, maxFollowers,
      minEngagement, maxEngagement, country, city, status,
      isVerified, sortBy = 'createdAt', sortOrder = 'desc',
      page = 1, limit = 50
    } = req.body;

    const query = {};

    // Text search
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { 'platforms.username': new RegExp(search, 'i') },
        { bio: new RegExp(search, 'i') }
      ];
    }

    // Platform filter
    if (platform) {
      query['platforms.platform'] = platform.toLowerCase();
    }

    // Keywords/category filter
    if (keywords) {
      const keywordIds = keywords.split(',').map(id => id.trim());
      query.keywords = { $in: keywordIds };
    }

    // Follower range
    if (minFollowers || maxFollowers) {
      query['platforms.followers'] = {};
      if (minFollowers) query['platforms.followers'].$gte = parseInt(minFollowers);
      if (maxFollowers) query['platforms.followers'].$lte = parseInt(maxFollowers);
    }

    // Engagement range
    if (minEngagement || maxEngagement) {
      query['platforms.engagement'] = {};
      if (minEngagement) query['platforms.engagement'].$gte = parseFloat(minEngagement);
      if (maxEngagement) query['platforms.engagement'].$lte = parseFloat(maxEngagement);
    }

    // Location
    if (country) query['location.country'] = new RegExp(country, 'i');
    if (city) query['location.city'] = new RegExp(city, 'i');

    // Status
    if (status) query.status = status;

    // Verified
    if (isVerified !== undefined) query.isVerified = isVerified === true || isVerified === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let sort = {};
    if (sortBy === 'followers') sort = { 'platforms.followers': sortOrder === 'asc' ? 1 : -1 };
    else if (sortBy === 'engagement') sort = { 'platforms.engagement': sortOrder === 'asc' ? 1 : -1 };
    else sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [influencers, total] = await Promise.all([
      Influencer.find(query)
        .populate('keywords', 'name displayName icon color')
        .sort(sort).skip(skip).limit(parseInt(limit)),
      Influencer.countDocuments(query)
    ]);

    const influencersWithComputed = influencers.map(inf => ({
      ...inf.toObject(),
      totalFollowers: inf.totalFollowers,
      avgEngagement: inf.avgEngagement,
      platformList: inf.platformList,
      platformCount: inf.platformCount
    }));

    res.status(200).json({
      success: true,
      count: influencers.length,
      total,
      data: influencersWithComputed
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
module.exports = {
  getInfluencers,
  getInfluencer,
  createInfluencer,
  updateInfluencer,
  deleteInfluencer,
  addPlatform,
  updatePlatform,
  removePlatform,
  assignKeywords,
  removeKeywords,
  getTopByEngagement,
  getInfluencerStats
};