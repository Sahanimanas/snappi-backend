const Influencer = require('../models/Influencer');
const Keyword = require('../models/Keyword');
const { asyncHandler } = require('../utils/helpers');

// ============================================
// CONSTANTS
// ============================================
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'with', 'for', 'in', 'on', 'at',
  'to', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'can', 'shall', 'not', 'no', 'from', 'by', 'about',
  'between', 'through', 'during', 'before', 'after', 'above', 'below',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'than',
  'too', 'very', 'just', 'also', 'who', 'whom', 'which', 'that', 'this',
  'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
  'what', 'am', 'want', 'need', 'looking', 'find', 'search', 'show',
  'get', 'give', 'like', 'plus'
]);

const KNOWN_PLATFORMS = ['instagram', 'youtube', 'tiktok', 'facebook', 'twitter', 'linkedin', 'pinterest', 'snapchat', 'twitch'];

const COUNTRY_ALIASES = {
  'usa': 'United States', 'us': 'United States', 'america': 'United States', 'united states': 'United States',
  'uk': 'United Kingdom', 'britain': 'United Kingdom', 'england': 'United Kingdom', 'united kingdom': 'United Kingdom',
  'canada': 'Canada', 'australia': 'Australia', 'germany': 'Germany', 'france': 'France',
  'india': 'India', 'brazil': 'Brazil', 'china': 'China', 'japan': 'Japan',
  'mexico': 'Mexico', 'south korea': 'South Korea', 'korea': 'South Korea',
  'spain': 'Spain', 'italy': 'Italy', 'russia': 'Russia', 'indonesia': 'Indonesia',
  'pakistan': 'Pakistan', 'nigeria': 'Nigeria', 'bangladesh': 'Bangladesh',
  'philippines': 'Philippines', 'egypt': 'Egypt', 'turkey': 'Turkey',
  'thailand': 'Thailand', 'vietnam': 'Vietnam', 'uae': 'United Arab Emirates',
  'dubai': 'United Arab Emirates', 'saudi': 'Saudi Arabia', 'saudi arabia': 'Saudi Arabia'
};

// ============================================
// HELPERS
// ============================================

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
}

function calculateMatchScore(influencer, matchedKeywordIds = []) {
  let score = 0;

  // Engagement (0-40 points)
  score += Math.min((influencer.avgEngagement || 0) * 4, 40);

  // Follower tier (0-20 points)
  const followers = influencer.totalFollowers || 0;
  if (followers >= 100000) score += 20;
  else if (followers >= 50000) score += 15;
  else if (followers >= 10000) score += 10;
  else score += 5;

  // Verified bonus (10 points)
  if (influencer.isVerified) score += 10;

  // Rating bonus (0-15 points)
  score += ((influencer.rating && influencer.rating.average) || 0) * 3;

  // Collaborations bonus (0-15 points)
  score += Math.min((influencer.totalCollaborations || 0) * 3, 15);

  // Keyword match bonus: more matching keywords = higher score
  if (matchedKeywordIds.length > 0 && influencer.keywords) {
    const kwIds = influencer.keywords.map(k => (k._id || k).toString());
    const matchCount = matchedKeywordIds.filter(id => kwIds.includes(id.toString())).length;
    score += matchCount * 5; // 5 bonus points per matched keyword
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Parse a natural language search query into structured parts:
 * - meaningful words (stripped of stop words)
 * - detected follower count (e.g. "100K+" → 100000)
 * - detected platforms (e.g. "youtube" "instagram")
 * - detected countries (e.g. "india", "usa")
 */
function parseSearchQuery(searchText) {
  const result = {
    searchWords: [],       // meaningful words for keyword/text matching
    minFollowers: null,    // extracted from "100K+", "50k followers" etc.
    maxFollowers: null,
    detectedPlatforms: [], // e.g. ["youtube", "instagram"]
    detectedCountry: null  // e.g. "India"
  };

  if (!searchText || searchText.trim() === '') return result;

  const raw = searchText.trim().toLowerCase();

  // 1) Extract follower counts like "100k+", "100k", "50K followers", "1M+", "500k-1m"
  const followerPatterns = [
    // Range: "50k-100k", "10k to 50k"
    /(\d+\.?\d*)\s*([km])\s*[-–to]+\s*(\d+\.?\d*)\s*([km])/gi,
    // "100K+" or "100K+ followers"
    /(\d+\.?\d*)\s*([km])\+?\s*(?:followers?|subs?|subscribers?)?/gi,
    // "100,000+" or "100000 followers"
    /(\d{1,3}(?:,\d{3})+)\+?\s*(?:followers?|subs?|subscribers?)?/gi
  ];

  let processedText = raw;

  // Check range pattern first
  const rangeMatch = raw.match(/(\d+\.?\d*)\s*([km])\s*[-–]|to\s*(\d+\.?\d*)\s*([km])/i);
  if (rangeMatch) {
    // handled below
  }

  // Extract "100K+" style
  const followerMatch = raw.match(/(\d+\.?\d*)\s*([km])\+?/i);
  if (followerMatch) {
    const num = parseFloat(followerMatch[1]);
    const multiplier = followerMatch[2].toLowerCase() === 'k' ? 1000 : 1000000;
    result.minFollowers = Math.round(num * multiplier);
    // Remove from text
    processedText = processedText.replace(followerMatch[0], ' ');
    // Also remove trailing "followers" word
    processedText = processedText.replace(/\s*followers?\s*/gi, ' ');
  }

  // Extract comma-separated numbers like "100,000"
  if (!result.minFollowers) {
    const commaMatch = raw.match(/(\d{1,3}(?:,\d{3})+)\+?/);
    if (commaMatch) {
      result.minFollowers = parseInt(commaMatch[1].replace(/,/g, ''));
      processedText = processedText.replace(commaMatch[0], ' ');
      processedText = processedText.replace(/\s*followers?\s*/gi, ' ');
    }
  }

  // 2) Detect platforms
  const words = processedText.split(/[\s,;.]+/).filter(w => w.length > 0);
  const remainingWords = [];

  for (const word of words) {
    const lw = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (KNOWN_PLATFORMS.includes(lw)) {
      result.detectedPlatforms.push(lw);
    } else if (COUNTRY_ALIASES[lw]) {
      result.detectedCountry = COUNTRY_ALIASES[lw];
    } else {
      remainingWords.push(lw);
    }
  }

  // 3) Check multi-word country names (e.g. "south korea", "united states")
  if (!result.detectedCountry) {
    const lowered = remainingWords.join(' ');
    for (const [alias, country] of Object.entries(COUNTRY_ALIASES)) {
      if (alias.includes(' ') && lowered.includes(alias)) {
        result.detectedCountry = country;
        // Remove these words
        const aliasWords = alias.split(' ');
        for (const aw of aliasWords) {
          const idx = remainingWords.indexOf(aw);
          if (idx >= 0) remainingWords.splice(idx, 1);
        }
        break;
      }
    }
  }

  // 4) Filter out stop words → these are the meaningful search terms
  result.searchWords = remainingWords.filter(w => w.length > 1 && !STOP_WORDS.has(w));

  return result;
}

// ============================================
// MAIN SEARCH ENDPOINT
// ============================================

// @desc    Search influencers with advanced filters + smart query parsing
// @route   POST /api/influencers/search
// @access  Private
exports.searchInfluencers = asyncHandler(async (req, res, next) => {
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

  let conditions = [];
  let allMatchedKeywordIds = []; // track for scoring

  // ============================================
  // SMART TEXT SEARCH — split into words, match each against keywords + text fields
  // ============================================
  if (search && search.trim() !== '') {
    const parsed = parseSearchQuery(search);
    console.log('Parsed search query:', parsed);

    // -- A) Match each meaningful word against Keywords collection --
    if (parsed.searchWords.length > 0) {
      const wordRegexes = parsed.searchWords.map(w => ({
        $or: [
          { name: { $regex: w, $options: 'i' } },
          { displayName: { $regex: w, $options: 'i' } }
        ]
      }));

      const matchingKeywords = await Keyword.find({
        $or: wordRegexes,
        isActive: true
      }).select('_id');
      const matchingKeywordIds = matchingKeywords.map(k => k._id);
      allMatchedKeywordIds.push(...matchingKeywordIds);

      // Build OR conditions: match any word against name, bio, niche, categories, keywords
      const wordConditions = [];
      for (const word of parsed.searchWords) {
        wordConditions.push(
          { name: { $regex: word, $options: 'i' } },
          { 'platforms.username': { $regex: word, $options: 'i' } },
          { bio: { $regex: word, $options: 'i' } },
          { niche: { $elemMatch: { $regex: word, $options: 'i' } } },
          { categories: { $elemMatch: { $regex: word, $options: 'i' } } }
        );
      }

      if (matchingKeywordIds.length > 0) {
        wordConditions.push({ keywords: { $in: matchingKeywordIds } });
      }

      conditions.push({ $or: wordConditions });
    }

    // -- B) Apply extracted follower count from search text (only if not already set by filters) --
    if (parsed.minFollowers && !minFollowers) {
      conditions.push({ platforms: { $elemMatch: { followers: { $gte: parsed.minFollowers } } } });
    }

    // -- C) Apply extracted platforms from search text (only if not already set by filters) --
    if (parsed.detectedPlatforms.length > 0 && (!platforms || platforms.length === 0)) {
      conditions.push({
        'platforms.platform': {
          $in: parsed.detectedPlatforms.map(p => new RegExp(`^${p}$`, 'i'))
        }
      });
    }

    // -- D) Apply extracted country from search text (only if not already set by filters) --
    if (parsed.detectedCountry && (!location || location === 'all' || location.trim() === '')) {
      conditions.push({
        $or: [
          { 'location.country': { $regex: parsed.detectedCountry, $options: 'i' } },
          { 'location.city': { $regex: parsed.detectedCountry, $options: 'i' } }
        ]
      });
    }
  }

  // ============================================
  // PLATFORM FILTER (from filter UI)
  // ============================================
  if (platforms && Array.isArray(platforms) && platforms.length > 0) {
    const validPlatforms = platforms.filter(p => p && p.trim() !== '');
    if (validPlatforms.length > 0) {
      conditions.push({
        'platforms.platform': {
          $in: validPlatforms.map(p => new RegExp(`^${p.trim()}$`, 'i'))
        }
      });
    }
  }

  // ============================================
  // NICHE FILTER (from filter UI) — match niche, categories + Keyword collection
  // ============================================
  if (niche && niche !== 'all' && niche.trim() !== '') {
    const nicheKeywords = await Keyword.find({
      $or: [
        { name: { $regex: niche, $options: 'i' } },
        { displayName: { $regex: niche, $options: 'i' } }
      ],
      isActive: true
    }).select('_id');
    const nicheKeywordIds = nicheKeywords.map(k => k._id);
    allMatchedKeywordIds.push(...nicheKeywordIds);

    const nicheOr = [
      { niche: { $elemMatch: { $regex: niche, $options: 'i' } } },
      { categories: { $elemMatch: { $regex: niche, $options: 'i' } } }
    ];

    if (nicheKeywordIds.length > 0) {
      nicheOr.push({ keywords: { $in: nicheKeywordIds } });
    }

    conditions.push({ $or: nicheOr });
  }

  // ============================================
  // LOCATION FILTER (from filter UI)
  // ============================================
  if (location && location !== 'all' && location.trim() !== '') {
    const countryName = COUNTRY_ALIASES[location.toLowerCase()] || location;
    conditions.push({
      $or: [
        { 'location.country': { $regex: countryName, $options: 'i' } },
        { 'location.city': { $regex: countryName, $options: 'i' } }
      ]
    });
  }

  // ============================================
  // KEYWORDS FILTER (from filter UI)
  // ============================================
  if (keywords && keywords.trim() !== '') {
    const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
    if (keywordArray.length > 0) {
      const keywordRegexConditions = keywordArray.map(k => ({
        $or: [
          { name: { $regex: k, $options: 'i' } },
          { displayName: { $regex: k, $options: 'i' } }
        ]
      }));
      const matchingKws = await Keyword.find({
        $or: keywordRegexConditions,
        isActive: true
      }).select('_id');
      const matchingKwIds = matchingKws.map(k => k._id);
      allMatchedKeywordIds.push(...matchingKwIds);

      const keywordConditions = keywordArray.map(keyword => ({
        $or: [
          { bio: { $regex: keyword, $options: 'i' } },
          { niche: { $elemMatch: { $regex: keyword, $options: 'i' } } },
          { categories: { $elemMatch: { $regex: keyword, $options: 'i' } } },
          { name: { $regex: keyword, $options: 'i' } }
        ]
      }));

      if (matchingKwIds.length > 0) {
        keywordConditions.push({ keywords: { $in: matchingKwIds } });
      }

      conditions.push({ $or: keywordConditions });
    }
  }

  // ============================================
  // FOLLOWER RANGE FILTER (from filter UI)
  // ============================================
  const followerRange = {};
  if (minFollowers !== undefined && minFollowers !== null && minFollowers !== '') {
    const min = parseInt(minFollowers);
    if (!isNaN(min) && min > 0) followerRange.$gte = min;
  }
  if (maxFollowers !== undefined && maxFollowers !== null && maxFollowers !== '') {
    const max = parseInt(maxFollowers);
    if (!isNaN(max) && max > 0) followerRange.$lte = max;
  }
  if (Object.keys(followerRange).length > 0) {
    conditions.push({ platforms: { $elemMatch: { followers: followerRange } } });
  }

  // ============================================
  // ENGAGEMENT RANGE FILTER (from filter UI)
  // ============================================
  const engagementRange = {};
  if (minEngagement !== undefined && minEngagement !== null && minEngagement !== '') {
    const min = parseFloat(minEngagement);
    if (!isNaN(min) && min >= 0) engagementRange.$gte = min;
  }
  if (maxEngagement !== undefined && maxEngagement !== null && maxEngagement !== '') {
    const max = parseFloat(maxEngagement);
    if (!isNaN(max) && max > 0) engagementRange.$lte = max;
  }
  if (Object.keys(engagementRange).length > 0) {
    conditions.push({ platforms: { $elemMatch: { engagement: engagementRange } } });
  }

  // ============================================
  // BUILD FINAL QUERY
  // ============================================
  let query = {};
  if (conditions.length > 0) {
    query.$and = conditions;
  }

  console.log("Final Query:", JSON.stringify(query, null, 2));

  // ============================================
  // EXECUTE (no .lean() — preserves virtuals)
  // ============================================
  const allResults = await Influencer.find(query)
    .populate('addedBy', 'name email')
    .populate('keywords', 'name displayName icon color');

  // Convert to plain objects WITH virtuals
  let allInfluencers = allResults.map(doc => doc.toObject({ virtuals: true }));

  console.log(`Found ${allInfluencers.length} influencers`);

  // ============================================
  // CALCULATE MATCH SCORES (keyword match bonus included)
  // ============================================
  allInfluencers = allInfluencers.map(inf => ({
    ...inf,
    matchScore: calculateMatchScore(inf, allMatchedKeywordIds)
  }));

  // ============================================
  // SORT
  // ============================================
  const sortFieldMap = {
    'followers': 'totalFollowers',
    'engagement': 'avgEngagement',
    'rating': 'rating.average',
    'totalCollaborations': 'totalCollaborations',
    'createdAt': 'createdAt',
    'name': 'name',
    'matchScore': 'matchScore'
  };

  let effectiveSortField = sortFieldMap[sortBy] || sortBy;

  if (campaignObjective === 'awareness') {
    effectiveSortField = 'totalFollowers';
  } else if (campaignObjective === 'sales') {
    effectiveSortField = 'avgEngagement';
  } else if (campaignObjective === 'both' || !campaignObjective) {
    if (!sortBy || sortBy === 'followers') {
      effectiveSortField = 'matchScore';
    }
  }

  const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
  allInfluencers.sort((a, b) => {
    const aVal = getNestedValue(a, effectiveSortField) ?? 0;
    const bVal = getNestedValue(b, effectiveSortField) ?? 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * sortMultiplier;
    }
    return (aVal - bVal) * sortMultiplier;
  });

  // ============================================
  // PAGINATE
  // ============================================
  const total = allInfluencers.length;
  let paginated = allInfluencers;
  if (limit && parseInt(limit) > 0) {
    const s = parseInt(skip) || 0;
    const l = parseInt(limit);
    paginated = allInfluencers.slice(s, s + l);
  }

  res.status(200).json({
    success: true,
    count: paginated.length,
    total,
    data: paginated
  });
});

// ============================================
// GET ALL INFLUENCERS
// ============================================

// @desc    Get all influencers (no filters, for "View All" button)
// @route   GET /api/influencers/search/all
// @access  Private
exports.getAllInfluencers = asyncHandler(async (req, res, next) => {
  const allResults = await Influencer.find({})
    .populate('addedBy', 'name email')
    .populate('keywords', 'name displayName icon color');

  let allInfluencers = allResults.map(doc => doc.toObject({ virtuals: true }));

  allInfluencers = allInfluencers.map(inf => ({
    ...inf,
    matchScore: calculateMatchScore(inf)
  }));

  allInfluencers.sort((a, b) => (b.totalFollowers || 0) - (a.totalFollowers || 0));

  res.status(200).json({
    success: true,
    count: allInfluencers.length,
    total: allInfluencers.length,
    data: allInfluencers
  });
});

// ============================================
// SEARCH SUGGESTIONS
// ============================================

// @desc    Get search suggestions (autocomplete)
// @route   GET /api/influencers/search/suggestions
// @access  Private
exports.getSearchSuggestions = asyncHandler(async (req, res, next) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({
      success: true,
      data: { names: [], niches: [], categories: [], keywords: [] }
    });
  }

  const [nameSuggestions, nicheResults, categoryResults, keywordResults] = await Promise.all([
    Influencer.find({ name: { $regex: q, $options: 'i' } })
      .select('name').limit(5).lean(),
    Influencer.aggregate([
      { $unwind: '$niche' },
      { $match: { niche: { $regex: q, $options: 'i' } } },
      { $group: { _id: '$niche' } },
      { $limit: 5 }
    ]),
    Influencer.aggregate([
      { $unwind: '$categories' },
      { $match: { categories: { $regex: q, $options: 'i' } } },
      { $group: { _id: '$categories' } },
      { $limit: 5 }
    ]),
    Keyword.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } }
      ],
      isActive: true
    }).select('displayName').limit(5).lean()
  ]);

  res.status(200).json({
    success: true,
    data: {
      names: nameSuggestions.map(n => n.name),
      niches: nicheResults.map(n => n._id),
      categories: categoryResults.map(c => c._id),
      keywords: keywordResults.map(k => k.displayName)
    }
  });
});

// ============================================
// FILTER OPTIONS
// ============================================

// @desc    Get filter options
// @route   GET /api/influencers/search/filters
// @access  Private
exports.getFilterOptions = asyncHandler(async (req, res, next) => {
  const [platformStats, nicheStats, categoryStats, countryStats, followerStats, engagementStats] = await Promise.all([
    Influencer.aggregate([
      { $unwind: '$platforms' },
      { $group: { _id: '$platforms.platform', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Influencer.aggregate([
      { $unwind: '$niche' },
      { $group: { _id: '$niche', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]),
    Influencer.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]),
    Influencer.aggregate([
      { $match: { 'location.country': { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$location.country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]),
    Influencer.aggregate([
      { $unwind: '$platforms' },
      { $group: { _id: null, minFollowers: { $min: '$platforms.followers' }, maxFollowers: { $max: '$platforms.followers' }, avgFollowers: { $avg: '$platforms.followers' } } }
    ]),
    Influencer.aggregate([
      { $unwind: '$platforms' },
      { $group: { _id: null, minEngagement: { $min: '$platforms.engagement' }, maxEngagement: { $max: '$platforms.engagement' }, avgEngagement: { $avg: '$platforms.engagement' } } }
    ])
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

// ============================================
// RECOMMENDATIONS
// ============================================

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

  if (platforms && Array.isArray(platforms) && platforms.length > 0) {
    const validPlatforms = platforms.filter(p => p && p.trim() !== '');
    if (validPlatforms.length > 0) {
      conditions.push({
        'platforms.platform': { $in: validPlatforms.map(p => new RegExp(`^${p.trim()}$`, 'i')) }
      });
    }
  }

  if (niche && niche.trim() !== '') {
    const nicheKeywords = await Keyword.find({
      $or: [
        { name: { $regex: niche, $options: 'i' } },
        { displayName: { $regex: niche, $options: 'i' } }
      ],
      isActive: true
    }).select('_id');
    const nicheKeywordIds = nicheKeywords.map(k => k._id);

    const nicheOr = [
      { niche: { $elemMatch: { $regex: niche, $options: 'i' } } },
      { categories: { $elemMatch: { $regex: niche, $options: 'i' } } }
    ];
    if (nicheKeywordIds.length > 0) {
      nicheOr.push({ keywords: { $in: nicheKeywordIds } });
    }
    conditions.push({ $or: nicheOr });
  }

  if (campaignObjective === 'awareness') {
    conditions.push({ platforms: { $elemMatch: { followers: { $gte: 50000 }, engagement: { $gte: 2 } } } });
  } else if (campaignObjective === 'sales') {
    conditions.push({ platforms: { $elemMatch: { engagement: { $gte: 4 } } } });
  } else {
    conditions.push({ platforms: { $elemMatch: { followers: { $gte: 10000 }, engagement: { $gte: 3 } } } });
  }

  if (budget && parseInt(budget) > 0) {
    conditions.push({ 'platforms.pricing.post': { $lte: parseInt(budget) } });
  }

  let query = {};
  if (conditions.length > 0) {
    query.$and = conditions;
  }

  const allResults = await Influencer.find(query)
    .limit(parseInt(limit))
    .populate('keywords', 'name displayName icon color');

  let recommendations = allResults.map(doc => doc.toObject({ virtuals: true }));

  recommendations = recommendations.map(inf => ({
    ...inf,
    recommendationScore: calculateMatchScore(inf)
  }));

  recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

  res.status(200).json({
    success: true,
    count: recommendations.length,
    data: recommendations
  });
});
