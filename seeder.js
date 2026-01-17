const mongoose = require('mongoose');
const Keyword = require('./models/Keyword');
const Influencer = require('./models/Influencer');
require('dotenv').config();

// Predefined keywords for filtering influencers
const keywordData = [
  // Fashion & Style
  { name: 'fashion', displayName: 'Fashion', icon: 'shirt', color: '#EC4899' },
  { name: 'style', displayName: 'Style', icon: 'sparkles', color: '#F472B6' },
  { name: 'ootd', displayName: 'OOTD', icon: 'camera', color: '#DB2777' },
  { name: 'streetwear', displayName: 'Streetwear', icon: 'shirt', color: '#BE185D' },
  { name: 'luxury', displayName: 'Luxury', icon: 'gem', color: '#9D174D' },
  
  // Beauty
  { name: 'beauty', displayName: 'Beauty', icon: 'sparkles', color: '#F472B6' },
  { name: 'makeup', displayName: 'Makeup', icon: 'palette', color: '#EC4899' },
  { name: 'skincare', displayName: 'Skincare', icon: 'droplet', color: '#F9A8D4' },
  { name: 'haircare', displayName: 'Haircare', icon: 'scissors', color: '#FBCFE8' },
  
  // Fitness & Health
  { name: 'fitness', displayName: 'Fitness', icon: 'dumbbell', color: '#EF4444' },
  { name: 'gym', displayName: 'Gym', icon: 'dumbbell', color: '#DC2626' },
  { name: 'yoga', displayName: 'Yoga', icon: 'heart', color: '#F87171' },
  { name: 'nutrition', displayName: 'Nutrition', icon: 'apple', color: '#FCA5A5' },
  { name: 'wellness', displayName: 'Wellness', icon: 'heart', color: '#FECACA' },
  
  // Food
  { name: 'food', displayName: 'Food', icon: 'utensils', color: '#F97316' },
  { name: 'cooking', displayName: 'Cooking', icon: 'chef-hat', color: '#EA580C' },
  { name: 'recipes', displayName: 'Recipes', icon: 'book', color: '#FB923C' },
  { name: 'foodie', displayName: 'Foodie', icon: 'utensils', color: '#FDBA74' },
  { name: 'vegan', displayName: 'Vegan', icon: 'leaf', color: '#22C55E' },
  
  // Travel
  { name: 'travel', displayName: 'Travel', icon: 'plane', color: '#06B6D4' },
  { name: 'adventure', displayName: 'Adventure', icon: 'mountain', color: '#0891B2' },
  { name: 'wanderlust', displayName: 'Wanderlust', icon: 'compass', color: '#22D3EE' },
  { name: 'backpacking', displayName: 'Backpacking', icon: 'backpack', color: '#67E8F9' },
  
  // Technology
  { name: 'tech', displayName: 'Tech', icon: 'cpu', color: '#3B82F6' },
  { name: 'gadgets', displayName: 'Gadgets', icon: 'smartphone', color: '#2563EB' },
  { name: 'gaming', displayName: 'Gaming', icon: 'gamepad', color: '#8B5CF6' },
  { name: 'software', displayName: 'Software', icon: 'code', color: '#1D4ED8' },
  { name: 'ai', displayName: 'AI', icon: 'brain', color: '#4F46E5' },
  
  // Entertainment
  { name: 'entertainment', displayName: 'Entertainment', icon: 'film', color: '#A855F7' },
  { name: 'movies', displayName: 'Movies', icon: 'film', color: '#9333EA' },
  { name: 'music', displayName: 'Music', icon: 'music', color: '#7C3AED' },
  { name: 'comedy', displayName: 'Comedy', icon: 'smile', color: '#C084FC' },
  
  // Lifestyle
  { name: 'lifestyle', displayName: 'Lifestyle', icon: 'heart', color: '#10B981' },
  { name: 'motivation', displayName: 'Motivation', icon: 'zap', color: '#059669' },
  { name: 'productivity', displayName: 'Productivity', icon: 'check-circle', color: '#34D399' },
  { name: 'minimalism', displayName: 'Minimalism', icon: 'minus', color: '#6EE7B7' },
  
  // Business & Finance
  { name: 'business', displayName: 'Business', icon: 'briefcase', color: '#059669' },
  { name: 'finance', displayName: 'Finance', icon: 'dollar-sign', color: '#047857' },
  { name: 'investing', displayName: 'Investing', icon: 'trending-up', color: '#10B981' },
  { name: 'entrepreneur', displayName: 'Entrepreneur', icon: 'rocket', color: '#34D399' },
  { name: 'crypto', displayName: 'Crypto', icon: 'bitcoin', color: '#F59E0B' },
  
  // Education
  { name: 'education', displayName: 'Education', icon: 'book', color: '#0EA5E9' },
  { name: 'learning', displayName: 'Learning', icon: 'graduation-cap', color: '#0284C7' },
  { name: 'tutorial', displayName: 'Tutorial', icon: 'play-circle', color: '#38BDF8' },
  { name: 'howto', displayName: 'How-To', icon: 'help-circle', color: '#7DD3FC' },
  
  // Family & Parenting
  { name: 'parenting', displayName: 'Parenting', icon: 'users', color: '#F59E0B' },
  { name: 'family', displayName: 'Family', icon: 'home', color: '#D97706' },
  { name: 'kids', displayName: 'Kids', icon: 'baby', color: '#FBBF24' },
  { name: 'mom', displayName: 'Mom Life', icon: 'heart', color: '#FCD34D' },
  
  // Pets
  { name: 'pets', displayName: 'Pets', icon: 'paw', color: '#84CC16' },
  { name: 'dogs', displayName: 'Dogs', icon: 'dog', color: '#65A30D' },
  { name: 'cats', displayName: 'Cats', icon: 'cat', color: '#A3E635' },
  
  // Sports
  { name: 'sports', displayName: 'Sports', icon: 'trophy', color: '#EAB308' },
  { name: 'football', displayName: 'Football', icon: 'football', color: '#CA8A04' },
  { name: 'basketball', displayName: 'Basketball', icon: 'basketball', color: '#FACC15' },
  { name: 'soccer', displayName: 'Soccer', icon: 'soccer', color: '#FDE047' },
  
  // Art & Design
  { name: 'art', displayName: 'Art', icon: 'palette', color: '#D946EF' },
  { name: 'design', displayName: 'Design', icon: 'pen-tool', color: '#C026D3' },
  { name: 'photography', displayName: 'Photography', icon: 'camera', color: '#E879F9' },
  { name: 'illustration', displayName: 'Illustration', icon: 'image', color: '#F0ABFC' },
  
  // Home & DIY
  { name: 'homedecor', displayName: 'Home Decor', icon: 'home', color: '#78716C' },
  { name: 'diy', displayName: 'DIY', icon: 'hammer', color: '#57534E' },
  { name: 'interior', displayName: 'Interior Design', icon: 'layout', color: '#A8A29E' },
  
  // Sustainability
  { name: 'sustainability', displayName: 'Sustainability', icon: 'leaf', color: '#22C55E' },
  { name: 'ecofriendly', displayName: 'Eco-Friendly', icon: 'recycle', color: '#16A34A' },
  { name: 'zerowaste', displayName: 'Zero Waste', icon: 'trash-2', color: '#4ADE80' },
  
  // Automotive
  { name: 'cars', displayName: 'Cars', icon: 'car', color: '#64748B' },
  { name: 'automotive', displayName: 'Automotive', icon: 'truck', color: '#475569' },
  { name: 'motorcycle', displayName: 'Motorcycle', icon: 'bike', color: '#94A3B8' }
];

const seedKeywords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    await Influencer.find({});
   
    process.exit(0);
  } catch (error) {
    console.error('Error seeding keywords:', error);
    process.exit(1);
  }
};

// Run with: node seeders/keywordSeeder.js
seedKeywords();