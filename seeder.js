const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// Load env vars
dotenv.config();

// Load models
const User = require('./models/User');
const Influencer = require('./models/Influencer');
const Campaign = require('./models/Campaign');
const CampaignInfluencer = require('./models/CampaignInfluencer');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Sample data
const users = [
  {
    name: 'Test Brand User',
    email: 'brand@test.com',
    password: 'password123',
    role: 'brand',
    company: 'Fashion Co.',
    phoneNumber: '+1234567890'
  }
];

const influencers = [
  {
    name: 'Ankit Chauhan',
    username: '@ankitchauhan',
    email: 'ankit@example.com',
    platform: 'instagram',
    profileUrl: 'https://instagram.com/ankitchauhan',
    followers: 5700,
    engagement: 60.0,
    avgViews: 100,
    matchScore: 40,
    niche: ['fitness'],
    categories: ['fitness', 'health'],
    country: 'India',
    status: 'available',
    bio: 'Fitness and wellness influencer',
    pricing: {
      post: 200,
      story: 50,
      reel: 300
    }
  },
  {
    name: 'Aman',
    username: '@aman',
    email: 'aman@example.com',
    platform: 'linkedin',
    profileUrl: 'https://linkedin.com/in/aman',
    followers: 7000,
    engagement: 5.0,
    avgViews: 1000,
    matchScore: 21,
    niche: ['technology'],
    categories: ['tech', 'business'],
    country: 'India',
    status: 'available',
    bio: 'Technology and business thought leader',
    pricing: {
      post: 350,
      story: 100
    }
  },
  {
    name: 'Sarah Johnson',
    username: '@sarahstyle',
    email: 'sarah@example.com',
    platform: 'instagram',
    profileUrl: 'https://instagram.com/sarahstyle',
    followers: 24000,
    engagement: 6.5,
    avgViews: 24900,
    matchScore: 94,
    niche: ['fashion', 'lifestyle'],
    categories: ['fashion', 'beauty', 'lifestyle'],
    country: 'USA',
    city: 'New York',
    status: 'available',
    bio: 'Fashion & lifestyle content creator',
    pricing: {
      post: 800,
      story: 200,
      reel: 1200
    }
  },
  {
    name: 'Mike Chen',
    username: '@techreviewmike',
    email: 'mike@example.com',
    platform: 'youtube',
    profileUrl: 'https://youtube.com/@techreviewmike',
    followers: 18300,
    engagement: 8.1,
    avgViews: 15000,
    matchScore: 89,
    niche: ['technology', 'reviews'],
    categories: ['tech', 'gadgets', 'reviews'],
    country: 'Canada',
    city: 'Toronto',
    status: 'available',
    bio: 'Tech reviewer and gadget enthusiast',
    pricing: {
      video: 1500,
      short: 300
    }
  },
  {
    name: 'Emma Wellness',
    username: '@emmawellness',
    email: 'emma@example.com',
    platform: 'tiktok',
    profileUrl: 'https://tiktok.com/@emmawellness',
    followers: 31000,
    engagement: 7.4,
    avgViews: 28000,
    matchScore: 92,
    niche: ['wellness', 'mental health'],
    categories: ['wellness', 'health', 'lifestyle'],
    country: 'UK',
    city: 'London',
    status: 'available',
    bio: 'Wellness advocate and mental health supporter',
    pricing: {
      post: 600,
      video: 1000
    }
  }
];

// Import into DB
const importData = async () => {
  try {
    // Create user first
    await User.deleteMany();
    await Influencer.deleteMany();
    await Campaign.deleteMany();
    await CampaignInfluencer.deleteMany();

    const createdUsers = await User.create(users);
    console.log('✅ Users Imported'.green.inverse);

    // Add user reference to influencers
    const influencersWithUser = influencers.map(inf => ({
      ...inf,
      addedBy: createdUsers[0]._id
    }));

    const createdInfluencers = await Influencer.create(influencersWithUser);
    console.log('✅ Influencers Imported'.green.inverse);

    // Create sample campaigns
    const campaigns = [
      {
        name: 'Spring Fashion Launch',
        description: 'Promote our new spring fashion collection',
        objective: 'brand_awareness',
        campaignType: 'sponsored_post',
        status: 'active',
        budget: {
          total: 5000,
          spent: 1200,
          remaining: 3800
        },
        targetPlatforms: ['instagram', 'tiktok'],
        demographics: {
          ageRange: ['18-24', '25-34'],
          gender: ['all'],
          location: {
            countries: ['USA', 'Canada', 'UK']
          }
        },
        compensationType: 'monetary',
        kpis: {
          impressions: true,
          engagement: true,
          reach: true
        },
        deliverables: [
          {
            type: 'post',
            quantity: 3,
            description: 'Instagram feed posts'
          },
          {
            type: 'story',
            quantity: 5,
            description: 'Instagram stories'
          }
        ],
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-07-31'),
        performance: {
          totalReach: 180000,
          totalEngagement: 12500,
          totalClicks: 3200,
          roi: 245
        },
        influencers: [createdInfluencers[2]._id, createdInfluencers[4]._id],
        createdBy: createdUsers[0]._id
      },
      {
        name: 'Tech Product Review',
        description: 'Get reviews for our new smartphone',
        objective: 'increase_sales',
        campaignType: 'product_review',
        status: 'draft',
        budget: {
          total: 3500,
          spent: 0,
          remaining: 3500
        },
        targetPlatforms: ['youtube'],
        demographics: {
          ageRange: ['18-24', '25-34', '35-44'],
          gender: ['all'],
          location: {
            countries: ['USA', 'Canada']
          }
        },
        compensationType: 'both',
        kpis: {
          impressions: true,
          clicks: true,
          conversions: true
        },
        deliverables: [
          {
            type: 'video',
            quantity: 1,
            description: 'Full product review video'
          }
        ],
        influencers: [createdInfluencers[3]._id],
        createdBy: createdUsers[0]._id
      }
    ];

    const createdCampaigns = await Campaign.create(campaigns);
    console.log('✅ Campaigns Imported'.green.inverse);

    // Create campaign-influencer relationships
    const campaignInfluencers = [
      {
        campaign: createdCampaigns[0]._id,
        influencer: createdInfluencers[2]._id,
        status: 'completed',
        compensation: {
          amount: 800,
          type: 'monetary',
          paid: true
        },
        trackingLink: 'https://track.snappi.com/campaign/summer-fashion/sarah-johnson',
        deliverables: [
          {
            type: 'post',
            url: 'https://instagram.com/p/xyz123',
            submittedAt: new Date(),
            approved: true,
            approvedAt: new Date()
          }
        ],
        performance: {
          reach: 95000,
          impressions: 120000,
          engagement: 8200,
          engagementRate: 6.8,
          clicks: 2100
        },
        acceptedAt: new Date('2024-06-05'),
        completedAt: new Date('2024-07-10')
      },
      {
        campaign: createdCampaigns[0]._id,
        influencer: createdInfluencers[4]._id,
        status: 'in_progress',
        compensation: {
          amount: 600,
          type: 'monetary',
          paid: false
        },
        trackingLink: 'https://track.snappi.com/campaign/summer-fashion/emma-wellness',
        performance: {
          reach: 85000,
          impressions: 105000,
          engagement: 4300,
          engagementRate: 5.1,
          clicks: 1100
        },
        acceptedAt: new Date('2024-06-08')
      }
    ];

    await CampaignInfluencer.create(campaignInfluencers);
    console.log('✅ Campaign-Influencer Relationships Imported'.green.inverse);

    console.log('
✅ All data imported successfully!'.green.bold);
    console.log(`
📧 Test Login Credentials:
   Email: ${users[0].email}
   Password: password123
`.cyan);

    process.exit();
  } catch (err) {
    console.error('❌ Error importing data:'.red, err);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Influencer.deleteMany();
    await Campaign.deleteMany();
    await CampaignInfluencer.deleteMany();

    console.log('✅ Data Destroyed'.red.inverse);
    process.exit();
  } catch (err) {
    console.error('❌ Error deleting data:'.red, err);
    process.exit(1);
  }
};

if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Please use -i to import or -d to delete data'.yellow);
  process.exit();
}
