const Influencer = require('../models/Influencer');
const { asyncHandler } = require('../utils/helpers');

// @desc    Search influencers with advanced filters (for SearchInfluencers page)
// @route   POST /api/influencers/search
// @access  Private
exports.searchInfluencers = asyncHandler(async (req, res, next) => {
  console.log("Request Body:", req.body);
  
  const {
    search,
    platforms,
    niche,
    location,
    keywords,
    minFollowers,
    maxFollowers,
    minEngagement,
    maxEngagement,
    campaignObjective,
    sortBy = 'followers',
    sortOrder = 'desc',
    limit,
    skip = 0
  } = req.body;

  // Start with empty query - will return ALL influencers if no filters
  let query = {};
  let conditions = [];

  // ============================================
  // TEXT SEARCH - search in name, username, bio
  // ============================================
  if (search && search.trim() !== '') {
    conditions.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { niche: { $elemMatch: { $regex: search, $options: 'i' } } },
        { categories: { $elemMatch: { $regex: search, $options: 'i' } } }
      ]
    });
  }

  // ============================================
  // PLATFORM FILTER - case-insensitive matching
  // ============================================
 // Case-insensitive platform matching
if (platforms && Array.isArray(platforms) && platforms.length > 0) {
  const validPlatforms = platforms.filter(p => p && p.trim() !== '');
  if (validPlatforms.length > 0) {
    conditions.push({
      platform: {
        $in: validPlatforms.map(p => new RegExp(`^${p.trim()}$`, 'i'))  // 'i' = case insensitive
      }
    });
  }
}

  // ============================================
  // NICHE FILTER - search in niche and categories arrays
  // ============================================
  if (niche && niche !== 'all' && niche.trim() !== '') {
    conditions.push({
      $or: [
        { niche: { $elemMatch: { $regex: niche, $options: 'i' } } },
        { categories: { $elemMatch: { $regex: niche, $options: 'i' } } }
      ]
    });
  }

  // ============================================
  // LOCATION/COUNTRY FILTER
  // ============================================
  if (location && location !== 'all' && location.trim() !== '') {
    const locationMap = {
      'usa': 'United States',
      'uk': 'United Kingdom',
      'canada': 'Canada',
      'australia': 'Australia',
      'germany': 'Germany',
      'france': 'France',
      'india': 'India',
      'brazil': 'Brazil',
      'china': 'China',
      'japan': 'Japan',
      'mexico': 'Mexico',
      'south-korea': 'South Korea',
      'afghanistan': 'Afghanistan',
      'albania': 'Albania',
      'algeria': 'Algeria',
      'argentina': 'Argentina'
    };
    
    const countryName = locationMap[location.toLowerCase()] || location;
    conditions.push({
      $or: [
        { country: { $regex: countryName, $options: 'i' } },
        { city: { $regex: countryName, $options: 'i' } }
      ]
    });
  }

  // ============================================
  // KEYWORDS FILTER
  // ============================================
  if (keywords && keywords.trim() !== '') {
    const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
    if (keywordArray.length > 0) {
      const keywordConditions = keywordArray.map(keyword => ({
        $or: [
          { bio: { $regex: keyword, $options: 'i' } },
          { niche: { $elemMatch: { $regex: keyword, $options: 'i' } } },
          { categories: { $elemMatch: { $regex: keyword, $options: 'i' } } },
          { name: { $regex: keyword, $options: 'i' } }
        ]
      }));
      // Match ANY of the keywords (OR logic)
      conditions.push({ $or: keywordConditions });
    }
  }

  // ============================================
  // FOLLOWER RANGE FILTER
  // ============================================
  if (minFollowers !== undefined && minFollowers !== null && minFollowers !== '') {
    const min = parseInt(minFollowers);
    if (!isNaN(min) && min > 0) {
      conditions.push({ followers: { $gte: min } });
    }
  }
  
  if (maxFollowers !== undefined && maxFollowers !== null && maxFollowers !== '') {
    const max = parseInt(maxFollowers);
    if (!isNaN(max) && max > 0) {
      conditions.push({ followers: { $lte: max } });
    }
  }

  // ============================================
  // ENGAGEMENT RANGE FILTER
  // ============================================
  if (minEngagement !== undefined && minEngagement !== null && minEngagement !== '') {
    const min = parseFloat(minEngagement);
    if (!isNaN(min) && min >= 0) {
      conditions.push({ engagement: { $gte: min } });
    }
  }
  
  if (maxEngagement !== undefined && maxEngagement !== null && maxEngagement !== '') {
    const max = parseFloat(maxEngagement);
    if (!isNaN(max) && max > 0) {
      conditions.push({ engagement: { $lte: max } });
    }
  }

  // ============================================
  // BUILD FINAL QUERY
  // Only use $and if we have conditions, otherwise return all
  // ============================================
  if (conditions.length > 0) {
    query.$and = conditions;
  }

  console.log("Final Query:", JSON.stringify(query, null, 2));

  // ============================================
  // SORT OPTIONS
  // ============================================
  let sort = {};
  if (campaignObjective === 'awareness') {
    sort = { followers: -1 };
  } else if (campaignObjective === 'sales') {
    sort = { engagement: -1 };
  } else {
    // Default sorting
    const validSortFields = ['followers', 'engagement', 'rating', 'totalCollaborations', 'createdAt', 'name'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'followers';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;
  }

  // ============================================
  // EXECUTE QUERY - build first, execute last
  // ============================================
  let queryBuilder = Influencer.find(query)
    .sort(sort)
    .populate('addedBy', 'name email');

  // Apply pagination if limit is provided
  if (limit && parseInt(limit) > 0) {
    queryBuilder = queryBuilder.skip(parseInt(skip) || 0).limit(parseInt(limit));
  }

  // Execute query
  const influencers = await queryBuilder.lean();

  // Get total count for pagination
  const total = await Influencer.countDocuments(query);

  console.log(`Found ${influencers.length} influencers out of ${total} total`);

  // ============================================
  // CALCULATE MATCH SCORES
  // ============================================
  const influencersWithScores = influencers.map(influencer => {
    let matchScore = 0;
    
    // Base score from engagement (0-40 points)
    matchScore += Math.min((influencer.engagement || 0) * 4, 40);
    
    // Score from follower tier (0-20 points)
    const followers = influencer.followers || 0;
    if (followers >= 100000) matchScore += 20;
    else if (followers >= 50000) matchScore += 15;
    else if (followers >= 10000) matchScore += 10;
    else matchScore += 5;
    
    // Bonus for verified accounts (10 points)
    if (influencer.verified) matchScore += 10;
    
    // Bonus for high rating (0-15 points)
    matchScore += (influencer.rating || 0) * 3;
    
    // Bonus for previous collaborations (0-15 points)
    matchScore += Math.min((influencer.totalCollaborations || 0) * 3, 15);
    
    return {
      ...influencer,
      matchScore: Math.min(Math.round(matchScore), 100)
    };
  });

  // Sort by match score if using 'both' or no specific objective
  if (campaignObjective === 'both' || !campaignObjective) {
    influencersWithScores.sort((a, b) => b.matchScore - a.matchScore);
  }

  res.status(200).json({
    success: true,
    count: influencersWithScores.length,
    total,
    data: influencersWithScores
  });
});

// @desc    Get all influencers (no filters, for "View All" button)
// @route   GET /api/influencers/all
// @access  Private
exports.getAllInfluencers = asyncHandler(async (req, res, next) => {
  const influencers = await Influencer.find({})
    .sort({ followers: -1 })
    .populate('addedBy', 'name email')
    .lean();

  // Add match scores
  const influencersWithScores = influencers.map(influencer => {
    let matchScore = 0;
    matchScore += Math.min((influencer.engagement || 0) * 4, 40);
    const followers = influencer.followers || 0;
    if (followers >= 100000) matchScore += 20;
    else if (followers >= 50000) matchScore += 15;
    else if (followers >= 10000) matchScore += 10;
    else matchScore += 5;
    if (influencer.verified) matchScore += 10;
    matchScore += (influencer.rating || 0) * 3;
    matchScore += Math.min((influencer.totalCollaborations || 0) * 3, 15);
    
    return {
      ...influencer,
      matchScore: Math.min(Math.round(matchScore), 100)
    };
  });

  res.status(200).json({
    success: true,
    count: influencersWithScores.length,
    total: influencersWithScores.length,
    data: influencersWithScores
  });
});

// @desc    Get search suggestions (autocomplete)
// @route   GET /api/influencers/search/suggestions
// @access  Private
exports.getSearchSuggestions = asyncHandler(async (req, res, next) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.status(200).json({
      success: true,
      data: {
        names: [],
        niches: [],
        categories: []
      }
    });
  }

  const nameSuggestions = await Influencer.find({
    name: { $regex: q, $options: 'i' }
  })
    .select('name')
    .limit(5)
    .lean();

  const nicheResults = await Influencer.aggregate([
    { $unwind: '$niche' },
    { $match: { niche: { $regex: q, $options: 'i' } } },
    { $group: { _id: '$niche' } },
    { $limit: 5 }
  ]);

  const categoryResults = await Influencer.aggregate([
    { $unwind: '$categories' },
    { $match: { categories: { $regex: q, $options: 'i' } } },
    { $group: { _id: '$categories' } },
    { $limit: 5 }
  ]);

  res.status(200).json({
    success: true,
    data: {
      names: nameSuggestions.map(n => n.name),
      niches: nicheResults.map(n => n._id),
      categories: categoryResults.map(c => c._id)
    }
  });
});

// @desc    Get filter options
// @route   GET /api/influencers/search/filters
// @access  Private
exports.getFilterOptions = asyncHandler(async (req, res, next) => {
  const platformStats = await Influencer.aggregate([
    { $group: { _id: '$platform', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const nicheStats = await Influencer.aggregate([
    { $unwind: '$niche' },
    { $group: { _id: '$niche', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  const categoryStats = await Influencer.aggregate([
    { $unwind: '$categories' },
    { $group: { _id: '$categories', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  const countryStats = await Influencer.aggregate([
    { $match: { country: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: '$country', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  const followerStats = await Influencer.aggregate([
    {
      $group: {
        _id: null,
        minFollowers: { $min: '$followers' },
        maxFollowers: { $max: '$followers' },
        avgFollowers: { $avg: '$followers' }
      }
    }
  ]);

  const engagementStats = await Influencer.aggregate([
    {
      $group: {
        _id: null,
        minEngagement: { $min: '$engagement' },
        maxEngagement: { $max: '$engagement' },
        avgEngagement: { $avg: '$engagement' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      platforms: platformStats.map(p => ({ value: p._id, count: p.count })),
      niches: nicheStats.map(n => ({ value: n._id, count: n.count })),
      categories: categoryStats.map(c => ({ value: c._id, count: c.count })),
      countries: countryStats.map(c => ({ value: c._id, count: c.count })),
      followerRange: followerStats[0] || { minFollowers: 0, maxFollowers: 500000, avgFollowers: 0 },
      engagementRange: engagementStats[0] || { minEngagement: 0, maxEngagement: 100, avgEngagement: 0 }
    }
  });
});

// @desc    Get influencer recommendations
// @route   POST /api/influencers/search/recommendations
// @access  Private
exports.getRecommendations = asyncHandler(async (req, res, next) => {
  const {
    campaignObjective,
    targetAudience,
    budget,
    platforms,
    niche,
    limit = 10
  } = req.body;

  let conditions = [];
  let sort = {};

  // Platform filter (case-insensitive)
  if (platforms && Array.isArray(platforms) && platforms.length > 0) {
    const validPlatforms = platforms.filter(p => p && p.trim() !== '');
    if (validPlatforms.length > 0) {
      conditions.push({
        platform: {
          $in: validPlatforms.map(p => new RegExp(`^${p.trim()}$`, 'i'))
        }
      });
    }
  }

  // Niche filter
  if (niche && niche.trim() !== '') {
    conditions.push({
      $or: [
        { niche: { $elemMatch: { $regex: niche, $options: 'i' } } },
        { categories: { $elemMatch: { $regex: niche, $options: 'i' } } }
      ]
    });
  }

  // Campaign objective filters
  if (campaignObjective === 'awareness') {
    conditions.push({ followers: { $gte: 50000 } });
    conditions.push({ engagement: { $gte: 2 } });
    sort = { followers: -1 };
  } else if (campaignObjective === 'sales') {
    conditions.push({ engagement: { $gte: 4 } });
    sort = { engagement: -1, followers: -1 };
  } else {
    conditions.push({ followers: { $gte: 10000 } });
    conditions.push({ engagement: { $gte: 3 } });
    sort = { engagement: -1 };
  }

  // Budget filter
  if (budget && parseInt(budget) > 0) {
    conditions.push({ 'pricing.post': { $lte: parseInt(budget) } });
  }

  // Build query
  let query = {};
  if (conditions.length > 0) {
    query.$and = conditions;
  }

  const recommendations = await Influencer.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .lean();

  // Calculate recommendation scores
  const scoredRecommendations = recommendations.map(influencer => {
    let score = 0;
    score += Math.min((influencer.engagement || 0) * 4, 40);
    const followers = influencer.followers || 0;
    if (followers >= 100000) score += 30;
    else if (followers >= 50000) score += 25;
    else if (followers >= 25000) score += 20;
    else if (followers >= 10000) score += 15;
    else score += 10;
    score += (influencer.rating || 0) * 4;
    score += Math.min((influencer.totalCollaborations || 0) * 2, 10);
    
    return {
      ...influencer,
      recommendationScore: Math.min(Math.round(score), 100)
    };
  });

  scoredRecommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

  res.status(200).json({
    success: true,
    count: scoredRecommendations.length,
    data: scoredRecommendations
  });
});