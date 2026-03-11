const Influencer = require('../models/Influencer');
const Campaign = require('../models/Campaign');
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
    campaignId,
    sortBy = 'followers',
    sortOrder = 'desc',
    limit,
    skip = 0
  } = req.body;

  let query = {};
  let conditions = [];

  // ============================================
  // TEXT SEARCH - improved multi-word search
  // Split search into individual words for better matching
  // e.g. "make up" matches influencers with "makeup", "make-up", "make up" etc.
  // ============================================
  if (search && search.trim() !== '') {
    const searchTerms = search.trim().split(/\s+/);

    if (searchTerms.length === 1) {
      // Single word: search across all fields
      conditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { 'platforms.username': { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } },
          { niche: { $elemMatch: { $regex: search, $options: 'i' } } },
          { categories: { $elemMatch: { $regex: search, $options: 'i' } } },
          { 'location.country': { $regex: search, $options: 'i' } },
          { 'location.city': { $regex: search, $options: 'i' } }
        ]
      });
    } else {
      // Multiple words: match ANY of the words (OR logic for broader results)
      // Also try the full phrase and concatenated version (e.g. "make up" -> "makeup")
      const concatenated = searchTerms.join('');
      const hyphenated = searchTerms.join('-');

      const wordConditions = [];

      // Full phrase match
      wordConditions.push(
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { 'platforms.username': { $regex: search, $options: 'i' } }
      );

      // Concatenated match (e.g. "makeup")
      wordConditions.push(
        { name: { $regex: concatenated, $options: 'i' } },
        { bio: { $regex: concatenated, $options: 'i' } },
        { niche: { $elemMatch: { $regex: concatenated, $options: 'i' } } },
        { categories: { $elemMatch: { $regex: concatenated, $options: 'i' } } }
      );

      // Hyphenated match (e.g. "make-up")
      wordConditions.push(
        { name: { $regex: hyphenated, $options: 'i' } },
        { bio: { $regex: hyphenated, $options: 'i' } },
        { niche: { $elemMatch: { $regex: hyphenated, $options: 'i' } } }
      );

      // Individual word matches
      searchTerms.forEach(term => {
        wordConditions.push(
          { name: { $regex: term, $options: 'i' } },
          { bio: { $regex: term, $options: 'i' } },
          { niche: { $elemMatch: { $regex: term, $options: 'i' } } },
          { categories: { $elemMatch: { $regex: term, $options: 'i' } } },
          { 'platforms.username': { $regex: term, $options: 'i' } }
        );
      });

      conditions.push({ $or: wordConditions });
    }
  }

  // ============================================
  // PLATFORM FILTER - case-insensitive matching
  // Also search in platforms array for multi-platform influencers
  // ============================================
  if (platforms && Array.isArray(platforms) && platforms.length > 0) {
    const validPlatforms = platforms.filter(p => p && p.trim() !== '');
    if (validPlatforms.length > 0) {
      conditions.push({
        $or: [
          { platform: { $in: validPlatforms.map(p => new RegExp(`^${p.trim()}$`, 'i')) } },
          { 'platforms.platform': { $in: validPlatforms.map(p => p.trim().toLowerCase()) } }
        ]
      });
    }
  }

  // ============================================
  // NICHE FILTER
  // ============================================
  if (niche && niche !== 'all' && niche.trim() !== '') {
    conditions.push({
      $or: [
        { niche: { $elemMatch: { $regex: niche, $options: 'i' } } },
        { categories: { $elemMatch: { $regex: niche, $options: 'i' } } },
        { bio: { $regex: niche, $options: 'i' } }
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
      'south africa': 'South Africa',
      'sa': 'South Africa'
    };

    const countryName = locationMap[location.toLowerCase()] || location;
    conditions.push({
      $or: [
        { country: { $regex: countryName, $options: 'i' } },
        { city: { $regex: countryName, $options: 'i' } },
        { 'location.country': { $regex: countryName, $options: 'i' } },
        { 'location.city': { $regex: countryName, $options: 'i' } }
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
      conditions.push({ $or: keywordConditions });
    }
  }

  // ============================================
  // FOLLOWER RANGE FILTER - also check platforms.followers
  // ============================================
  if (minFollowers !== undefined && minFollowers !== null && minFollowers !== '') {
    const min = parseInt(minFollowers);
    if (!isNaN(min) && min > 0) {
      conditions.push({
        $or: [
          { followers: { $gte: min } },
          { 'platforms.followers': { $gte: min } }
        ]
      });
    }
  }

  if (maxFollowers !== undefined && maxFollowers !== null && maxFollowers !== '') {
    const max = parseInt(maxFollowers);
    if (!isNaN(max) && max > 0) {
      conditions.push({
        $or: [
          { followers: { $lte: max } },
          { 'platforms.followers': { $lte: max } }
        ]
      });
    }
  }

  // ============================================
  // ENGAGEMENT RANGE FILTER
  // ============================================
  if (minEngagement !== undefined && minEngagement !== null && minEngagement !== '') {
    const min = parseFloat(minEngagement);
    if (!isNaN(min) && min >= 0) {
      conditions.push({
        $or: [
          { engagement: { $gte: min } },
          { 'platforms.engagement': { $gte: min } }
        ]
      });
    }
  }

  if (maxEngagement !== undefined && maxEngagement !== null && maxEngagement !== '') {
    const max = parseFloat(maxEngagement);
    if (!isNaN(max) && max > 0) {
      conditions.push({
        $or: [
          { engagement: { $lte: max } },
          { 'platforms.engagement': { $lte: max } }
        ]
      });
    }
  }

  // ============================================
  // BUILD FINAL QUERY
  // ============================================
  if (conditions.length > 0) {
    query.$and = conditions;
  }

  console.log("Final Query:", JSON.stringify(query, null, 2));

  // ============================================
  // SORT OPTIONS
  // ============================================
  let sort = {};
  if (campaignObjective === 'awareness' || campaignObjective === 'brand_awareness') {
    sort = { followers: -1 };
  } else if (campaignObjective === 'sales' || campaignObjective === 'increase_sales') {
    sort = { engagement: -1 };
  } else if (campaignObjective === 'engagement') {
    sort = { engagement: -1 };
  } else {
    const validSortFields = ['followers', 'engagement', 'rating', 'totalCollaborations', 'createdAt', 'name'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'followers';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;
  }

  // ============================================
  // EXECUTE QUERY
  // ============================================
  let queryBuilder = Influencer.find(query)
    .sort(sort)
    .populate('addedBy', 'name email');

  if (limit && parseInt(limit) > 0) {
    queryBuilder = queryBuilder.skip(parseInt(skip) || 0).limit(parseInt(limit));
  }

  const influencers = await queryBuilder.lean();
  const total = await Influencer.countDocuments(query);

  console.log(`Found ${influencers.length} influencers out of ${total} total`);

  // ============================================
  // CALCULATE MATCH SCORES (with campaign scope if provided)
  // ============================================
  let campaignData = null;
  if (campaignId) {
    try {
      campaignData = await Campaign.findById(campaignId).lean();
    } catch (e) {
      // Campaign not found, skip scope-based scoring
    }
  }

  const influencersWithScores = influencers.map(influencer => {
    let matchScore = 0;

    // Base score from engagement (0-30 points)
    // Calculate real engagement rate: (likes + comments + shares + saves) / followers
    const totalFollowers = influencer.followers ||
      (influencer.platforms ? influencer.platforms.reduce((sum, p) => sum + (p.followers || 0), 0) : 0);

    let calculatedEngagement = influencer.engagement || 0;
    if (influencer.platforms && influencer.platforms.length > 0) {
      const totalInteractions = influencer.platforms.reduce((sum, p) => {
        return sum + (p.avgLikes || 0) + (p.avgComments || 0);
      }, 0);
      if (totalFollowers > 0 && totalInteractions > 0) {
        calculatedEngagement = (totalInteractions / totalFollowers) * 100;
      }
    }

    matchScore += Math.min(calculatedEngagement * 4, 30);

    // Score from follower tier (0-20 points)
    const followers = totalFollowers;
    if (followers >= 100000) matchScore += 20;
    else if (followers >= 50000) matchScore += 15;
    else if (followers >= 10000) matchScore += 10;
    else matchScore += 5;

    // Bonus for verified accounts (10 points)
    if (influencer.verified || influencer.isVerified) matchScore += 10;

    // Bonus for high rating (0-15 points)
    const ratingAvg = influencer.rating?.average || influencer.rating || 0;
    matchScore += ratingAvg * 3;

    // Bonus for previous collaborations (0-10 points)
    matchScore += Math.min((influencer.totalCollaborations || 0) * 2, 10);

    // Campaign scope matching bonus (0-15 points)
    if (campaignData) {
      // Platform match
      const influencerPlatforms = influencer.platforms
        ? influencer.platforms.map(p => p.platform)
        : [influencer.platform].filter(Boolean);

      const campaignPlatforms = campaignData.targetPlatforms || [];
      const platformOverlap = influencerPlatforms.filter(p =>
        campaignPlatforms.includes(p)
      ).length;
      if (platformOverlap > 0) matchScore += 5;

      // Location match
      const campaignCountries = campaignData.demographics?.location?.countries || [];
      const influencerCountry = influencer.location?.country || influencer.country || '';
      if (campaignCountries.length > 0 && campaignCountries.some(c =>
        c.toLowerCase() === influencerCountry.toLowerCase()
      )) {
        matchScore += 5;
      }

      // Objective-specific scoring
      if (campaignData.objective === 'brand_awareness' && followers >= 50000) matchScore += 5;
      if (campaignData.objective === 'engagement' && calculatedEngagement >= 3) matchScore += 5;
      if (campaignData.objective === 'increase_sales' && calculatedEngagement >= 4) matchScore += 5;
    }

    return {
      ...influencer,
      calculatedEngagement: Math.round(calculatedEngagement * 100) / 100,
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
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { 'platforms.username': { $regex: q, $options: 'i' } }
    ]
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

// @desc    Get influencer recommendations based on campaign
// @route   POST /api/influencers/search/recommendations
// @access  Private
exports.getRecommendations = asyncHandler(async (req, res, next) => {
  const {
    campaignId,
    campaignObjective,
    targetAudience,
    budget,
    platforms,
    niche,
    scope,
    limit = 5
  } = req.body;

  let conditions = [];
  let sort = {};

  // If campaignId is provided, get campaign details for smarter matching
  let campaignData = null;
  if (campaignId) {
    campaignData = await Campaign.findById(campaignId).lean();
  }

  // Use campaign data if available
  const effectivePlatforms = platforms || campaignData?.targetPlatforms || [];
  const effectiveObjective = campaignObjective || campaignData?.objective;
  const effectiveNiche = niche || '';
  const effectiveScope = scope || campaignData?.scope || '';

  // Platform filter (case-insensitive)
  if (effectivePlatforms.length > 0) {
    conditions.push({
      $or: [
        { platform: { $in: effectivePlatforms.map(p => new RegExp(`^${p.trim()}$`, 'i')) } },
        { 'platforms.platform': { $in: effectivePlatforms.map(p => p.trim().toLowerCase()) } }
      ]
    });
  }

  // Niche filter
  if (effectiveNiche.trim() !== '') {
    conditions.push({
      $or: [
        { niche: { $elemMatch: { $regex: effectiveNiche, $options: 'i' } } },
        { categories: { $elemMatch: { $regex: effectiveNiche, $options: 'i' } } },
        { bio: { $regex: effectiveNiche, $options: 'i' } }
      ]
    });
  }

  // Scope-based search (search scope keywords in bio/niche)
  if (effectiveScope.trim() !== '') {
    const scopeWords = effectiveScope.split(/\s+/).filter(w => w.length > 3);
    if (scopeWords.length > 0) {
      const scopeConditions = scopeWords.map(word => ({
        $or: [
          { bio: { $regex: word, $options: 'i' } },
          { niche: { $elemMatch: { $regex: word, $options: 'i' } } },
          { categories: { $elemMatch: { $regex: word, $options: 'i' } } }
        ]
      }));
      // Match ANY scope word
      conditions.push({ $or: scopeConditions });
    }
  }

  // Campaign objective filters
  if (effectiveObjective === 'brand_awareness' || effectiveObjective === 'awareness') {
    sort = { followers: -1 };
  } else if (effectiveObjective === 'increase_sales' || effectiveObjective === 'sales') {
    conditions.push({ engagement: { $gte: 3 } });
    sort = { engagement: -1, followers: -1 };
  } else if (effectiveObjective === 'engagement') {
    conditions.push({ engagement: { $gte: 2 } });
    sort = { engagement: -1 };
  } else {
    sort = { engagement: -1 };
  }

  // Budget filter
  if (budget && parseInt(budget) > 0) {
    conditions.push({
      $or: [
        { 'pricing.post': { $lte: parseInt(budget) } },
        { 'platforms.pricing.post': { $lte: parseInt(budget) } }
      ]
    });
  }

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

    // Engagement (0-30 pts)
    score += Math.min((influencer.engagement || 0) * 4, 30);

    // Followers (0-25 pts)
    const followers = influencer.followers || 0;
    if (followers >= 100000) score += 25;
    else if (followers >= 50000) score += 20;
    else if (followers >= 25000) score += 15;
    else if (followers >= 10000) score += 10;
    else score += 5;

    // Rating (0-15 pts)
    const ratingAvg = influencer.rating?.average || influencer.rating || 0;
    score += ratingAvg * 3;

    // Collaborations (0-10 pts)
    score += Math.min((influencer.totalCollaborations || 0) * 2, 10);

    // Campaign match bonuses (0-20 pts)
    if (campaignData) {
      const inflPlatforms = influencer.platforms
        ? influencer.platforms.map(p => p.platform)
        : [influencer.platform].filter(Boolean);
      const campaignPlatforms = campaignData.targetPlatforms || [];
      if (inflPlatforms.some(p => campaignPlatforms.includes(p))) score += 10;

      const campaignCountries = campaignData.demographics?.location?.countries || [];
      const inflCountry = influencer.location?.country || influencer.country || '';
      if (campaignCountries.some(c => c.toLowerCase() === inflCountry.toLowerCase())) score += 10;
    }

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
