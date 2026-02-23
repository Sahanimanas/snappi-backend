const Keyword = require('../models/Keyword');
const Influencer = require('../models/Influencer');
const asyncHandler = require('express-async-handler');

// @desc    Get all keywords with influencer counts
// @route   GET /api/keywords
// @access  Public
const getKeywords = asyncHandler(async (req, res) => {
  const { search, isActive, sortBy = 'displayName', sortOrder = 'asc' } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { displayName: new RegExp(search, 'i') }
    ];
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const keywords = await Keyword.aggregate([
    { $match: query },
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
        description: 1,
        icon: 1,
        color: 1,
        isActive: 1,
        influencers: 1,
        influencerCount: { $size: '$matchedInfluencers' },
        createdAt: 1
      }
    },
    { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } }
  ]);

  res.status(200).json({
    success: true,
    count: keywords.length,
    data: keywords
  });
});

// @desc    Get keyword list for dropdown (simplified)
// @route   GET /api/keywords/list
// @access  Public
const getKeywordList = asyncHandler(async (req, res) => {
  const keywords = await Keyword.getKeywordList();
  
  res.status(200).json({
    success: true,
    count: keywords.length,
    data: keywords
  });
});

// @desc    Get single keyword with its influencers
// @route   GET /api/keywords/:id
// @access  Public
const getKeyword = asyncHandler(async (req, res) => {
  const keyword = await Keyword.findById(req.params.id);

  if (!keyword) {
    res.status(404);
    throw new Error('Keyword not found');
  }

  res.status(200).json({
    success: true,
    data: {
      ...keyword.toObject(),
      influencerCount: keyword.influencerCount
    }
  });
});

// @desc    Get influencers by keyword (MAIN FILTER ENDPOINT)
// @route   GET /api/keywords/:id/influencers
// @access  Public
const getInfluencersByKeyword = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    platform,
    minFollowers,
    maxFollowers,
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  const keyword = await Keyword.findById(req.params.id);

  if (!keyword) {
    res.status(404);
    throw new Error('Keyword not found');
  }

  if (!keyword.influencers || keyword.influencers.length === 0) {
    return res.status(200).json({
      success: true,
      keyword: keyword.displayName,
      count: 0,
      total: 0,
      totalPages: 0,
      currentPage: parseInt(page),
      data: []
    });
  }

  // Build query for additional filters
  const query = { _id: { $in: keyword.influencers } };

  if (platform) {
    query['platforms.platform'] = platform.toLowerCase();
  }

  if (minFollowers || maxFollowers) {
    query['platforms.followers'] = {};
    if (minFollowers) query['platforms.followers'].$gte = parseInt(minFollowers);
    if (maxFollowers) query['platforms.followers'].$lte = parseInt(maxFollowers);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

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
    platformList: inf.platformList
  }));

  res.status(200).json({
    success: true,
    keyword: keyword.displayName,
    count: influencers.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: influencersWithComputed
  });
});

// @desc    Create new keyword
// @route   POST /api/keywords
// @access  Private/Admin
const createKeyword = asyncHandler(async (req, res) => {
  const { name, displayName, description, icon, color } = req.body;

  const existingKeyword = await Keyword.findOne({ 
    name: name.toLowerCase().trim() 
  });
  
  if (existingKeyword) {
    res.status(400);
    throw new Error('Keyword already exists');
  }

  const keyword = await Keyword.create({
    name: name.toLowerCase().trim(),
    displayName: displayName.trim(),
    description,
    icon,
    color,
    influencers: [],
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    message: 'Keyword created successfully',
    data: keyword
  });
});

// @desc    Update keyword
// @route   PUT /api/keywords/:id
// @access  Private/Admin
const updateKeyword = asyncHandler(async (req, res) => {
  let keyword = await Keyword.findById(req.params.id);

  if (!keyword) {
    res.status(404);
    throw new Error('Keyword not found');
  }

  const { name, displayName, description, icon, color, isActive } = req.body;

  // Check for duplicate name
  if (name && name.toLowerCase().trim() !== keyword.name) {
    const existingKeyword = await Keyword.findOne({ 
      name: name.toLowerCase().trim(),
      _id: { $ne: req.params.id }
    });
    
    if (existingKeyword) {
      res.status(400);
      throw new Error('Keyword with this name already exists');
    }
  }

  const updateData = {
    ...(name && { name: name.toLowerCase().trim() }),
    ...(displayName && { displayName: displayName.trim() }),
    ...(description !== undefined && { description }),
    ...(icon !== undefined && { icon }),
    ...(color && { color }),
    ...(isActive !== undefined && { isActive }),
    updatedBy: req.user._id
  };

  keyword = await Keyword.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Keyword updated successfully',
    data: keyword
  });
});

// @desc    Delete keyword
// @route   DELETE /api/keywords/:id
// @access  Private/Admin
const deleteKeyword = asyncHandler(async (req, res) => {
  const keyword = await Keyword.findById(req.params.id);

  if (!keyword) {
    res.status(404);
    throw new Error('Keyword not found');
  }

  // Remove keyword reference from all influencers
  await Influencer.updateMany(
    { keywords: req.params.id },
    { $pull: { keywords: req.params.id } }
  );

  await keyword.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Keyword deleted successfully',
    data: {}
  });
});

// @desc    Assign influencer to keyword
// @route   POST /api/keywords/:id/influencers/:influencerId
// @access  Private/Admin
const assignInfluencer = asyncHandler(async (req, res) => {
  const { id: keywordId, influencerId } = req.params;

  const [keyword, influencer] = await Promise.all([
    Keyword.findById(keywordId),
    Influencer.findById(influencerId)
  ]);

  if (!keyword) {
    res.status(404);
    throw new Error('Keyword not found');
  }

  if (!influencer) {
    res.status(404);
    throw new Error('Influencer not found');
  }

  // Check if already assigned
  if (keyword.influencers.includes(influencerId)) {
    res.status(400);
    throw new Error('Influencer is already assigned to this keyword');
  }

  // Add to keyword's influencers array
  keyword.influencers.push(influencerId);
  keyword.updatedBy = req.user._id;
  await keyword.save();

  // Add to influencer's keywords array (reverse reference)
  if (!influencer.keywords.includes(keywordId)) {
    influencer.keywords.push(keywordId);
    influencer.updatedBy = req.user._id;
    await influencer.save();
  }

  res.status(200).json({
    success: true,
    message: `Influencer assigned to "${keyword.displayName}" successfully`,
    data: {
      keyword: keyword.displayName,
      influencer: influencer.name,
      totalInfluencers: keyword.influencers.length
    }
  });
});

// @desc    Remove influencer from keyword
// @route   DELETE /api/keywords/:id/influencers/:influencerId
// @access  Private/Admin
const removeInfluencer = asyncHandler(async (req, res) => {
  const { id: keywordId, influencerId } = req.params;

  const [keyword, influencer] = await Promise.all([
    Keyword.findById(keywordId),
    Influencer.findById(influencerId)
  ]);

  if (!keyword) {
    res.status(404);
    throw new Error('Keyword not found');
  }

  if (!influencer) {
    res.status(404);
    throw new Error('Influencer not found');
  }

  // Remove from keyword's influencers array
  keyword.influencers = keyword.influencers.filter(
    id => id.toString() !== influencerId
  );
  keyword.updatedBy = req.user._id;
  await keyword.save();

  // Remove from influencer's keywords array
  influencer.keywords = influencer.keywords.filter(
    id => id.toString() !== keywordId
  );
  influencer.updatedBy = req.user._id;
  await influencer.save();

  res.status(200).json({
    success: true,
    message: `Influencer removed from "${keyword.displayName}" successfully`,
    data: {
      keyword: keyword.displayName,
      influencer: influencer.name,
      totalInfluencers: keyword.influencers.length
    }
  });
});

// @desc    Bulk assign influencers to keyword
// @route   POST /api/keywords/:id/influencers/bulk
// @access  Private/Admin
const bulkAssignInfluencers = asyncHandler(async (req, res) => {
  const { influencerIds } = req.body;

  if (!influencerIds || !Array.isArray(influencerIds) || influencerIds.length === 0) {
    res.status(400);
    throw new Error('Please provide influencerIds array');
  }

  const keyword = await Keyword.findById(req.params.id);

  if (!keyword) {
    res.status(404);
    throw new Error('Keyword not found');
  }

  // Verify all influencers exist
  const influencers = await Influencer.find({ _id: { $in: influencerIds } });
  
  if (influencers.length !== influencerIds.length) {
    res.status(400);
    throw new Error('One or more influencer IDs are invalid');
  }

  let addedCount = 0;

  for (const influencerId of influencerIds) {
    // Add to keyword if not already there
    if (!keyword.influencers.includes(influencerId)) {
      keyword.influencers.push(influencerId);
      addedCount++;
    }

    // Add to influencer's keywords
    const influencer = influencers.find(i => i._id.toString() === influencerId);
    if (influencer && !influencer.keywords.includes(req.params.id)) {
      influencer.keywords.push(req.params.id);
      await influencer.save();
    }
  }

  keyword.updatedBy = req.user._id;
  await keyword.save();

  res.status(200).json({
    success: true,
    message: `${addedCount} influencer(s) assigned to "${keyword.displayName}"`,
    data: {
      keyword: keyword.displayName,
      addedCount,
      totalInfluencers: keyword.influencers.length
    }
  });
});

// @desc    Get keyword stats
// @route   GET /api/keywords/stats
// @access  Private/Admin
const getKeywordStats = asyncHandler(async (req, res) => {
  const stats = await Keyword.aggregate([
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
        isActive: 1,
        influencerCount: { $size: '$matchedInfluencers' }
      }
    },
    { $sort: { influencerCount: -1 } }
  ]);

  const totalKeywords = stats.length;
  const activeKeywords = stats.filter(k => k.isActive).length;
  const totalAssignments = stats.reduce((sum, k) => sum + k.influencerCount, 0);

  res.status(200).json({
    success: true,
    data: {
      totalKeywords,
      activeKeywords,
      totalAssignments,
      keywords: stats
    }
  });
});

// @desc    Bulk create keywords
// @route   POST /api/keywords/bulk
// @access  Private/Admin
const bulkCreateKeywords = asyncHandler(async (req, res) => {
  const { keywords } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    res.status(400);
    throw new Error('Please provide keywords array');
  }

  const results = { created: [], failed: [] };

  for (const data of keywords) {
    try {
      const existing = await Keyword.findOne({ 
        name: data.name.toLowerCase().trim() 
      });

      if (existing) {
        results.failed.push({ name: data.name, reason: 'Already exists' });
        continue;
      }

      const keyword = await Keyword.create({
        name: data.name.toLowerCase().trim(),
        displayName: data.displayName || data.name,
        description: data.description || '',
        icon: data.icon || '',
        color: data.color || '#6366f1',
        influencers: [],
        createdBy: req.user._id
      });

      results.created.push(keyword);
    } catch (error) {
      results.failed.push({ name: data.name, reason: error.message });
    }
  }

  res.status(201).json({
    success: true,
    message: `${results.created.length} keyword(s) created, ${results.failed.length} failed`,
    data: results
  });
});

module.exports = {
  getKeywords,
  getKeywordList,
  getKeyword,
  getInfluencersByKeyword,
  createKeyword,
  updateKeyword,
  deleteKeyword,
  assignInfluencer,
  removeInfluencer,
  bulkAssignInfluencers,
  getKeywordStats,
  bulkCreateKeywords
};