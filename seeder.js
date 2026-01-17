// seeders/influencerSeeder.js
const mongoose = require('mongoose');
const Influencer = require('./models/Influencer');
const Keyword = require('./models/Keyword');
require('dotenv').config();

const seedInfluencers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Get keyword IDs
    const keywords = await Keyword.find({});
    const keywordMap = {};
    keywords.forEach(k => {
      keywordMap[k.name] = k._id;
    });

    // Helper to get keyword IDs
    const getKeywordIds = (names) => {
      return names.map(n => keywordMap[n]).filter(Boolean);
    };

    // Clear existing data
    await Influencer.deleteMany({});
    console.log('Cleared existing influencers');

    // Admin user ID (replace with actual admin ID from your DB)
    const adminUserId = new mongoose.Types.ObjectId();

    const influencersData = [
      // ===== YOUTUBE / ENTERTAINMENT =====
      {
        name: 'MrBeast',
        email: 'contact@mrbeast.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_kmmDE-4MYXF1dV4_dN65AzYnb8q0oDj3yB1UVHjMBT2w=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'MrBeast',
            profileUrl: 'https://youtube.com/@MrBeast',
            followers: 336000000,
            engagement: 4.2,
            avgViews: 80000000,
            avgLikes: 4000000,
            avgComments: 150000,
            postsCount: 800,
            verified: true,
            pricing: { video: 500000 }
          },
          {
            platform: 'instagram',
            username: 'mrbeast',
            profileUrl: 'https://instagram.com/mrbeast',
            followers: 45000000,
            engagement: 3.8,
            avgLikes: 1500000,
            avgComments: 25000,
            postsCount: 350,
            verified: true,
            pricing: { post: 150000, story: 75000 }
          },
          {
            platform: 'twitter',
            username: 'MrBeast',
            profileUrl: 'https://twitter.com/MrBeast',
            followers: 30000000,
            engagement: 2.5,
            avgLikes: 200000,
            verified: true
          },
          {
            platform: 'tiktok',
            username: 'mrbeast',
            profileUrl: 'https://tiktok.com/@mrbeast',
            followers: 102000000,
            engagement: 5.1,
            avgViews: 25000000,
            avgLikes: 3000000,
            verified: true
          }
        ],
        keywords: getKeywordIds(['entertainment', 'comedy', 'lifestyle', 'motivation']),
        location: { country: 'USA', state: 'North Carolina', city: 'Raleigh' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 70, female: 28, other: 2 },
          topCountries: [
            { country: 'USA', percentage: 35 },
            { country: 'India', percentage: 12 },
            { country: 'Brazil', percentage: 8 }
          ]
        },
        status: 'busy',
        bio: 'I want to make the world a better place before I die. Philanthropy & entertainment.',
        contactInfo: { email: 'business@mrbeast.com', preferredContact: 'email' },
        rating: { average: 4.9, count: 245 },
        totalCollaborations: 150,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      {
        name: 'PewDiePie',
        email: 'contact@pewdiepie.com',
        profileImage: 'https://yt3.googleusercontent.com/5oUY3tashyxfqsjO5SGhjT4dus8FkN9CsAHwXWISFrdPYii1FudD4ICtLfuCw6-THJsJbgoY=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'PewDiePie',
            profileUrl: 'https://youtube.com/@PewDiePie',
            followers: 111000000,
            engagement: 3.5,
            avgViews: 5000000,
            avgLikes: 400000,
            avgComments: 35000,
            postsCount: 4800,
            verified: true,
            pricing: { video: 250000 }
          },
          {
            platform: 'instagram',
            username: 'pewdiepie',
            profileUrl: 'https://instagram.com/pewdiepie',
            followers: 22000000,
            engagement: 4.2,
            avgLikes: 800000,
            verified: true
          },
          {
            platform: 'twitter',
            username: 'pewdiepie',
            profileUrl: 'https://twitter.com/pewdiepie',
            followers: 19000000,
            engagement: 2.8,
            verified: true
          }
        ],
        keywords: getKeywordIds(['gaming', 'entertainment', 'comedy']),
        location: { country: 'Japan', city: 'Tokyo' },
        languages: ['English', 'Swedish'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 75, female: 23, other: 2 }
        },
        status: 'available',
        bio: 'Swedish YouTuber and gamer. Big PP energy.',
        rating: { average: 4.7, count: 180 },
        totalCollaborations: 200,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      // ===== TECH INFLUENCERS =====
      {
        name: 'Marques Brownlee',
        email: 'contact@mkbhd.com',
        profileImage: 'https://yt3.googleusercontent.com/lkH37D712tiyphLZ8CeXThFBOD39D2LFCNF4NU9tm7w87g2K2K4X_Q8TZhPD7i6__9p3X7bz2mU=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'MKBHD',
            profileUrl: 'https://youtube.com/@mkbhd',
            followers: 19500000,
            engagement: 4.8,
            avgViews: 4000000,
            avgLikes: 250000,
            avgComments: 15000,
            postsCount: 1600,
            verified: true,
            pricing: { video: 300000 }
          },
          {
            platform: 'instagram',
            username: 'mkbhd',
            profileUrl: 'https://instagram.com/mkbhd',
            followers: 4500000,
            engagement: 5.2,
            avgLikes: 200000,
            verified: true,
            pricing: { post: 80000 }
          },
          {
            platform: 'twitter',
            username: 'MKBHD',
            profileUrl: 'https://twitter.com/MKBHD',
            followers: 6800000,
            engagement: 3.1,
            verified: true
          },
          {
            platform: 'tiktok',
            username: 'mkbhd',
            profileUrl: 'https://tiktok.com/@mkbhd',
            followers: 3200000,
            engagement: 6.5,
            verified: true
          }
        ],
        keywords: getKeywordIds(['tech', 'gadgets', 'software', 'tutorial']),
        location: { country: 'USA', state: 'New Jersey' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '25-34',
          gender: { male: 82, female: 16, other: 2 }
        },
        status: 'available',
        bio: 'Quality tech videos. Host of Waveform podcast. Professional frisbee player.',
        contactInfo: { email: 'business@mkbhd.com', preferredContact: 'email' },
        rating: { average: 4.9, count: 320 },
        totalCollaborations: 180,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      {
        name: 'MrWhoseTheBoss',
        email: 'contact@mrwhosetheboss.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_lK-IoIfcPR0Vc3PQkKQPxSyZNPQWEg3HSp_0vIBz4Jxw=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'Mrwhosetheboss',
            profileUrl: 'https://youtube.com/@Mrwhosetheboss',
            followers: 19200000,
            engagement: 5.1,
            avgViews: 5500000,
            avgLikes: 300000,
            avgComments: 18000,
            postsCount: 900,
            verified: true,
            pricing: { video: 200000 }
          },
          {
            platform: 'instagram',
            username: 'mrwhosetheboss',
            profileUrl: 'https://instagram.com/mrwhosetheboss',
            followers: 2100000,
            engagement: 4.8,
            avgLikes: 90000,
            verified: true,
            pricing: { post: 50000, story: 25000 }
          },
          {
            platform: 'tiktok',
            username: 'mrwhosetheboss',
            profileUrl: 'https://tiktok.com/@mrwhosetheboss',
            followers: 8500000,
            engagement: 7.2,
            avgViews: 2000000,
            verified: true
          },
          {
            platform: 'twitter',
            username: 'MrwhosetheBoss',
            profileUrl: 'https://twitter.com/MrwhosetheBoss',
            followers: 850000,
            engagement: 2.9,
            verified: true
          }
        ],
        keywords: getKeywordIds(['tech', 'gadgets', 'software']),
        location: { country: 'UK', city: 'London' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 78, female: 20, other: 2 }
        },
        status: 'available',
        bio: 'Tech reviewer. Making videos about smartphones, gadgets & the future of technology.',
        rating: { average: 4.8, count: 210 },
        totalCollaborations: 95,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      {
        name: 'Linus Sebastian',
        email: 'contact@linusmediagroup.com',
        profileImage: 'https://yt3.googleusercontent.com/Vy6KL7EM_apxPSxF0pPy5w_c87YDTOlBQo3MADDF0K_nfaoESTGr5hPZmGBhP6I2pOqPBf5nVzE=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'LinusTechTips',
            profileUrl: 'https://youtube.com/@LinusTechTips',
            followers: 16500000,
            engagement: 4.5,
            avgViews: 2500000,
            avgLikes: 150000,
            avgComments: 12000,
            postsCount: 6500,
            verified: true,
            pricing: { video: 180000 }
          },
          {
            platform: 'twitter',
            username: 'LinusTech',
            profileUrl: 'https://twitter.com/LinusTech',
            followers: 3200000,
            engagement: 2.4,
            verified: true
          },
          {
            platform: 'instagram',
            username: 'linustech',
            profileUrl: 'https://instagram.com/linustech',
            followers: 1100000,
            engagement: 3.8,
            verified: true
          }
        ],
        keywords: getKeywordIds(['tech', 'gadgets', 'gaming', 'software', 'tutorial']),
        location: { country: 'Canada', state: 'British Columbia', city: 'Vancouver' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '25-34',
          gender: { male: 88, female: 10, other: 2 }
        },
        status: 'busy',
        bio: 'CEO of Linus Media Group. Tech enthusiast, PC builder, and sandal enjoyer.',
        rating: { average: 4.7, count: 280 },
        totalCollaborations: 250,
        isVerified: true,
        addedBy: adminUserId
      },

      // ===== TIKTOK / SHORT-FORM =====
      {
        name: 'Khaby Lame',
        email: 'contact@khabylame.com',
        profileImage: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/7094616818156175366~c5_1080x1080.jpeg',
        platforms: [
          {
            platform: 'tiktok',
            username: 'khaby.lame',
            profileUrl: 'https://tiktok.com/@khaby.lame',
            followers: 162000000,
            engagement: 8.5,
            avgViews: 50000000,
            avgLikes: 8000000,
            avgComments: 100000,
            postsCount: 1200,
            verified: true,
            pricing: { video: 400000 }
          },
          {
            platform: 'instagram',
            username: 'khaby00',
            profileUrl: 'https://instagram.com/khaby00',
            followers: 80000000,
            engagement: 4.2,
            avgLikes: 3000000,
            verified: true,
            pricing: { post: 250000, reel: 350000 }
          },
          {
            platform: 'youtube',
            username: 'KhabyLame',
            profileUrl: 'https://youtube.com/@KhabyLame',
            followers: 80500000,
            engagement: 3.8,
            avgViews: 15000000,
            verified: true
          }
        ],
        keywords: getKeywordIds(['comedy', 'entertainment', 'lifestyle']),
        location: { country: 'Italy', city: 'Milan' },
        languages: ['Italian', 'English'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 55, female: 43, other: 2 }
        },
        status: 'busy',
        bio: 'If you wanna laugh you are in the right place. Keep it simple.',
        rating: { average: 4.8, count: 150 },
        totalCollaborations: 85,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      {
        name: "Charli D'Amelio",
        email: 'contact@charlidamelio.com',
        profileImage: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/03807528ce824a80a5cc3d82b63bc54a~c5_1080x1080.jpeg',
        platforms: [
          {
            platform: 'tiktok',
            username: 'charlidamelio',
            profileUrl: 'https://tiktok.com/@charlidamelio',
            followers: 155000000,
            engagement: 6.8,
            avgViews: 20000000,
            avgLikes: 3500000,
            postsCount: 2500,
            verified: true,
            pricing: { video: 300000 }
          },
          {
            platform: 'instagram',
            username: 'charlidamelio',
            profileUrl: 'https://instagram.com/charlidamelio',
            followers: 55000000,
            engagement: 3.5,
            avgLikes: 1800000,
            verified: true,
            pricing: { post: 200000, story: 100000 }
          },
          {
            platform: 'youtube',
            username: 'charlidamelio',
            profileUrl: 'https://youtube.com/@charlidamelio',
            followers: 9500000,
            engagement: 4.1,
            avgViews: 2000000,
            verified: true
          }
        ],
        keywords: getKeywordIds(['entertainment', 'lifestyle', 'fashion']),
        location: { country: 'USA', state: 'California', city: 'Los Angeles' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '13-17',
          gender: { male: 35, female: 62, other: 3 }
        },
        status: 'busy',
        bio: 'Dancer, creator, and entrepreneur.',
        rating: { average: 4.5, count: 120 },
        totalCollaborations: 200,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      {
        name: 'Zach King',
        email: 'contact@zachking.com',
        profileImage: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/eb4e2c52789d8cbd9f4a4b8cf4e67e1d~c5_1080x1080.jpeg',
        platforms: [
          {
            platform: 'tiktok',
            username: 'zachking',
            profileUrl: 'https://tiktok.com/@zachking',
            followers: 82000000,
            engagement: 7.2,
            avgViews: 25000000,
            avgLikes: 4000000,
            postsCount: 600,
            verified: true,
            pricing: { video: 250000 }
          },
          {
            platform: 'instagram',
            username: 'zachking',
            profileUrl: 'https://instagram.com/zachking',
            followers: 27000000,
            engagement: 5.1,
            avgLikes: 1200000,
            verified: true,
            pricing: { post: 150000, reel: 200000 }
          },
          {
            platform: 'youtube',
            username: 'ZachKingVine',
            profileUrl: 'https://youtube.com/@ZachKing',
            followers: 15000000,
            engagement: 3.5,
            avgViews: 8000000,
            verified: true
          }
        ],
        keywords: getKeywordIds(['entertainment', 'comedy', 'art']),
        location: { country: 'USA', state: 'California', city: 'Los Angeles' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 52, female: 45, other: 3 }
        },
        status: 'available',
        bio: 'Digital magician and filmmaker. Creating the impossible one video at a time.',
        rating: { average: 4.9, count: 175 },
        totalCollaborations: 120,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      // ===== GAMING =====
      {
        name: 'IShowSpeed',
        email: 'contact@ishowspeed.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_mVMNAqMB7S1e5v5X7SqL0b0q-3mBQMKHMOeD7B7OLJOg=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'IShowSpeed',
            profileUrl: 'https://youtube.com/@IShowSpeed',
            followers: 28000000,
            engagement: 6.5,
            avgViews: 8000000,
            avgLikes: 600000,
            avgComments: 45000,
            postsCount: 850,
            verified: true,
            pricing: { video: 150000, live: 200000 }
          },
          {
            platform: 'tiktok',
            username: 'ishowspeed',
            profileUrl: 'https://tiktok.com/@ishowspeed',
            followers: 25000000,
            engagement: 8.2,
            avgViews: 10000000,
            verified: true
          },
          {
            platform: 'instagram',
            username: 'ishowspeed',
            profileUrl: 'https://instagram.com/ishowspeed',
            followers: 8500000,
            engagement: 5.8,
            avgLikes: 500000,
            verified: true
          },
          {
            platform: 'twitter',
            username: 'IShowSpeed',
            profileUrl: 'https://twitter.com/IShowSpeed',
            followers: 4200000,
            engagement: 4.1,
            verified: true
          }
        ],
        keywords: getKeywordIds(['gaming', 'entertainment', 'comedy', 'sports', 'soccer']),
        location: { country: 'USA', state: 'Ohio', city: 'Cincinnati' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '13-17',
          gender: { male: 80, female: 18, other: 2 }
        },
        status: 'available',
        bio: 'Streamer, entertainer, Ronaldo fan. SUIII!',
        rating: { average: 4.6, count: 95 },
        totalCollaborations: 45,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      {
        name: 'Ninja',
        email: 'contact@ninja.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_lMXCCVq45Q4-2EzdEgCMmHlOIijWqXuB8VL3Wx8A=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'twitch',
            username: 'Ninja',
            profileUrl: 'https://twitch.tv/ninja',
            followers: 19000000,
            engagement: 5.2,
            avgViews: 25000,
            verified: true,
            pricing: { live: 100000 }
          },
          {
            platform: 'youtube',
            username: 'Ninja',
            profileUrl: 'https://youtube.com/@Ninja',
            followers: 24000000,
            engagement: 2.8,
            avgViews: 500000,
            verified: true
          },
          {
            platform: 'instagram',
            username: 'ninja',
            profileUrl: 'https://instagram.com/ninja',
            followers: 12000000,
            engagement: 2.5,
            avgLikes: 250000,
            verified: true,
            pricing: { post: 75000 }
          },
          {
            platform: 'twitter',
            username: 'Ninja',
            profileUrl: 'https://twitter.com/Ninja',
            followers: 7800000,
            engagement: 1.8,
            verified: true
          }
        ],
        keywords: getKeywordIds(['gaming', 'entertainment']),
        location: { country: 'USA', state: 'Illinois', city: 'Chicago' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 85, female: 13, other: 2 }
        },
        status: 'available',
        bio: 'Professional gamer and streamer. Fortnite legend.',
        rating: { average: 4.5, count: 160 },
        totalCollaborations: 180,
        isVerified: true,
        addedBy: adminUserId
      },

      {
        name: 'Pokimane',
        email: 'contact@pokimane.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_mw74J5B3Gs2qxPZeUuXo8Xda4c8gtqO0VGF4a4BPM6fw=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'twitch',
            username: 'pokimane',
            profileUrl: 'https://twitch.tv/pokimane',
            followers: 9500000,
            engagement: 4.8,
            avgViews: 15000,
            verified: true,
            pricing: { live: 80000 }
          },
          {
            platform: 'youtube',
            username: 'pokimane',
            profileUrl: 'https://youtube.com/@pokimane',
            followers: 6800000,
            engagement: 4.2,
            avgViews: 800000,
            verified: true
          },
          {
            platform: 'instagram',
            username: 'pokimanelol',
            profileUrl: 'https://instagram.com/pokimanelol',
            followers: 6500000,
            engagement: 5.5,
            avgLikes: 350000,
            verified: true,
            pricing: { post: 60000 }
          },
          {
            platform: 'twitter',
            username: 'pokaborea',
            profileUrl: 'https://twitter.com/pokimanelol',
            followers: 4100000,
            engagement: 3.2,
            verified: true
          },
          {
            platform: 'tiktok',
            username: 'pokimane',
            profileUrl: 'https://tiktok.com/@pokimane',
            followers: 9800000,
            engagement: 6.8,
            verified: true
          }
        ],
        keywords: getKeywordIds(['gaming', 'entertainment', 'lifestyle']),
        location: { country: 'USA', state: 'California', city: 'Los Angeles' },
        languages: ['English', 'French'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 65, female: 32, other: 3 }
        },
        status: 'available',
        bio: 'Content creator, streamer, and co-founder of OfflineTV.',
        rating: { average: 4.7, count: 140 },
        totalCollaborations: 95,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      // ===== SPORTS / ATHLETES =====
      {
        name: 'Cristiano Ronaldo',
        email: 'contact@cristiano.com',
        profileImage: 'https://instagram.fccu3-1.fna.fbcdn.net/v/t51.2885-19/277870543_683512296081406_5765924247498093857_n.jpg',
        platforms: [
          {
            platform: 'instagram',
            username: 'cristiano',
            profileUrl: 'https://instagram.com/cristiano',
            followers: 640000000,
            engagement: 1.8,
            avgLikes: 10000000,
            avgComments: 150000,
            postsCount: 3600,
            verified: true,
            pricing: { post: 3200000, story: 1500000 }
          },
          {
            platform: 'youtube',
            username: 'Cristiano',
            profileUrl: 'https://youtube.com/@Cristiano',
            followers: 65000000,
            engagement: 4.5,
            avgViews: 15000000,
            verified: true
          },
          {
            platform: 'twitter',
            username: 'Cristiano',
            profileUrl: 'https://twitter.com/Cristiano',
            followers: 112000000,
            engagement: 1.2,
            verified: true
          },
          {
            platform: 'facebook',
            username: 'Cristiano',
            profileUrl: 'https://facebook.com/Cristiano',
            followers: 170000000,
            engagement: 0.8,
            verified: true
          }
        ],
        keywords: getKeywordIds(['sports', 'soccer', 'fitness', 'lifestyle']),
        location: { country: 'Saudi Arabia', city: 'Riyadh' },
        languages: ['Portuguese', 'English', 'Spanish'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 60, female: 38, other: 2 }
        },
        status: 'busy',
        bio: 'Professional footballer. Al-Nassr FC. SIUUUU!',
        rating: { average: 5.0, count: 500 },
        totalCollaborations: 300,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      {
        name: 'Dude Perfect',
        email: 'contact@dudeperfect.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_kEvIS6Vb7bfHsTQ-3P0lAyLEGFgVJcOt0hA7JKYA=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'DudePerfect',
            profileUrl: 'https://youtube.com/@DudePerfect',
            followers: 60000000,
            engagement: 3.8,
            avgViews: 30000000,
            avgLikes: 1500000,
            avgComments: 50000,
            postsCount: 450,
            verified: true,
            pricing: { video: 350000 }
          },
          {
            platform: 'instagram',
            username: 'dudeperfect',
            profileUrl: 'https://instagram.com/dudeperfect',
            followers: 12000000,
            engagement: 4.2,
            avgLikes: 450000,
            verified: true,
            pricing: { post: 100000 }
          },
          {
            platform: 'tiktok',
            username: 'dudeperfect',
            profileUrl: 'https://tiktok.com/@dudeperfect',
            followers: 28000000,
            engagement: 6.5,
            avgViews: 8000000,
            verified: true
          },
          {
            platform: 'twitter',
            username: 'DudePerfect',
            profileUrl: 'https://twitter.com/DudePerfect',
            followers: 2800000,
            engagement: 2.1,
            verified: true
          }
        ],
        keywords: getKeywordIds(['sports', 'entertainment', 'comedy']),
        location: { country: 'USA', state: 'Texas', city: 'Frisco' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '13-17',
          gender: { male: 72, female: 26, other: 2 }
        },
        status: 'available',
        bio: 'Five best friends making trick shots and having fun.',
        rating: { average: 4.8, count: 220 },
        totalCollaborations: 150,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      // ===== LIFESTYLE / VLOGGERS =====
      {
        name: 'Emma Chamberlain',
        email: 'contact@emmachamberlain.com',
        profileImage: 'https://yt3.googleusercontent.com/UOVYh8I-npq0wLqMLzB5RKr8eCJQC4_9eKl4x_hZqGYMNUjIqBKBQ6xJw8CBm_uKxq3U8vl8=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'emmachamberlain',
            profileUrl: 'https://youtube.com/@emmachamberlain',
            followers: 12000000,
            engagement: 5.5,
            avgViews: 3500000,
            avgLikes: 350000,
            avgComments: 15000,
            postsCount: 320,
            verified: true,
            pricing: { video: 200000 }
          },
          {
            platform: 'instagram',
            username: 'emmachamberlain',
            profileUrl: 'https://instagram.com/emmachamberlain',
            followers: 16000000,
            engagement: 4.8,
            avgLikes: 700000,
            verified: true,
            pricing: { post: 150000, story: 75000 }
          },
          {
            platform: 'tiktok',
            username: 'emmachamberlain',
            profileUrl: 'https://tiktok.com/@emmachamberlain',
            followers: 3500000,
            engagement: 6.2,
            verified: true
          }
        ],
        keywords: getKeywordIds(['lifestyle', 'fashion', 'food', 'coffee']),
        location: { country: 'USA', state: 'California', city: 'Los Angeles' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 25, female: 72, other: 3 }
        },
        status: 'available',
        bio: 'YouTuber, podcaster, and founder of Chamberlain Coffee.',
        rating: { average: 4.7, count: 180 },
        totalCollaborations: 120,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      {
        name: 'Casey Neistat',
        email: 'contact@caseyneistat.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_mdVyv0MoNDhGy8-s5pZwE6jZyoLBB4VDaBP2Y6=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'caseyneistat',
            profileUrl: 'https://youtube.com/@caseyneistat',
            followers: 12500000,
            engagement: 4.2,
            avgViews: 2000000,
            avgLikes: 150000,
            avgComments: 8000,
            postsCount: 1100,
            verified: true,
            pricing: { video: 180000 }
          },
          {
            platform: 'instagram',
            username: 'caseyneistat',
            profileUrl: 'https://instagram.com/caseyneistat',
            followers: 3400000,
            engagement: 3.5,
            avgLikes: 100000,
            verified: true,
            pricing: { post: 80000 }
          },
          {
            platform: 'twitter',
            username: 'CaseyNeistat',
            profileUrl: 'https://twitter.com/CaseyNeistat',
            followers: 3100000,
            engagement: 2.2,
            verified: true
          }
        ],
        keywords: getKeywordIds(['lifestyle', 'travel', 'adventure', 'photography']),
        location: { country: 'USA', state: 'New York', city: 'New York City' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '25-34',
          gender: { male: 68, female: 30, other: 2 }
        },
        status: 'available',
        bio: 'Filmmaker, vlogger, and entrepreneur. Do what you cant.',
        rating: { average: 4.8, count: 250 },
        totalCollaborations: 200,
        isVerified: true,
        addedBy: adminUserId
      },

      {
        name: 'David Dobrik',
        email: 'contact@daviddobrik.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_l4Y5X7lG_8h95pPjLW_HGjJzGUCYNDRqLwXjVb=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'DavidDobrik',
            profileUrl: 'https://youtube.com/@DavidDobrik',
            followers: 17500000,
            engagement: 4.8,
            avgViews: 8000000,
            avgLikes: 500000,
            postsCount: 600,
            verified: true,
            pricing: { video: 250000 }
          },
          {
            platform: 'instagram',
            username: 'daviddobrik',
            profileUrl: 'https://instagram.com/daviddobrik',
            followers: 11500000,
            engagement: 5.2,
            avgLikes: 600000,
            verified: true,
            pricing: { post: 120000 }
          },
          {
            platform: 'tiktok',
            username: 'daviddobrik',
            profileUrl: 'https://tiktok.com/@daviddobrik',
            followers: 28000000,
            engagement: 7.5,
            avgViews: 10000000,
            verified: true
          }
        ],
        keywords: getKeywordIds(['entertainment', 'comedy', 'lifestyle']),
        location: { country: 'USA', state: 'California', city: 'Los Angeles' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 45, female: 52, other: 3 }
        },
        status: 'available',
        bio: 'YouTuber and founder of Vlog Squad. Making people smile.',
        rating: { average: 4.4, count: 150 },
        totalCollaborations: 180,
        isVerified: true,
        addedBy: adminUserId
      },

      // ===== BEAUTY & FASHION =====
      {
        name: 'James Charles',
        email: 'contact@jamescharles.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_l-NuMaJx1U8DjQm2Q8F4LJ9lZj5sF8FBnQpIJGpQ=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'JamesCharles',
            profileUrl: 'https://youtube.com/@jamescharles',
            followers: 23500000,
            engagement: 3.8,
            avgViews: 4000000,
            avgLikes: 300000,
            postsCount: 450,
            verified: true,
            pricing: { video: 180000 }
          },
          {
            platform: 'instagram',
            username: 'jamescharles',
            profileUrl: 'https://instagram.com/jamescharles',
            followers: 21000000,
            engagement: 2.8,
            avgLikes: 500000,
            verified: true,
            pricing: { post: 100000 }
          },
          {
            platform: 'tiktok',
            username: 'jamescharles',
            profileUrl: 'https://tiktok.com/@jamescharles',
            followers: 37000000,
            engagement: 5.5,
            avgViews: 5000000,
            verified: true
          }
        ],
        keywords: getKeywordIds(['beauty', 'makeup', 'fashion', 'lifestyle']),
        location: { country: 'USA', state: 'California', city: 'Los Angeles' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 20, female: 78, other: 2 }
        },
        status: 'available',
        bio: 'Beauty influencer and makeup artist. Hi sisters!',
        rating: { average: 4.2, count: 130 },
        totalCollaborations: 150,
        isVerified: true,
        addedBy: adminUserId
      },

      {
        name: 'Kylie Jenner',
        email: 'contact@kyliejenner.com',
        profileImage: 'https://instagram.fccu3-1.fna.fbcdn.net/v/t51.2885-19/361770568_635918468613519_1755070282286340297_n.jpg',
        platforms: [
          {
            platform: 'instagram',
            username: 'kyliejenner',
            profileUrl: 'https://instagram.com/kyliejenner',
            followers: 400000000,
            engagement: 1.5,
            avgLikes: 5000000,
            avgComments: 50000,
            postsCount: 7200,
            verified: true,
            pricing: { post: 1800000, story: 900000 }
          },
          {
            platform: 'tiktok',
            username: 'kyliejenner',
            profileUrl: 'https://tiktok.com/@kyliejenner',
            followers: 55000000,
            engagement: 4.2,
            avgViews: 15000000,
            verified: true
          },
          {
            platform: 'twitter',
            username: 'KylieJenner',
            profileUrl: 'https://twitter.com/KylieJenner',
            followers: 38000000,
            engagement: 0.8,
            verified: true
          }
        ],
        keywords: getKeywordIds(['beauty', 'fashion', 'lifestyle', 'luxury', 'makeup', 'skincare']),
        location: { country: 'USA', state: 'California', city: 'Los Angeles' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 18, female: 80, other: 2 }
        },
        status: 'busy',
        bio: 'Founder of Kylie Cosmetics and Kylie Skin.',
        rating: { average: 4.6, count: 400 },
        totalCollaborations: 250,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      // ===== FITNESS =====
      {
        name: 'Simeon Panda',
        email: 'contact@simeonpanda.com',
        profileImage: 'https://instagram.fccu3-1.fna.fbcdn.net/v/t51.2885-19/358028341_1349104985990839_8604533283822871831_n.jpg',
        platforms: [
          {
            platform: 'instagram',
            username: 'simeonpanda',
            profileUrl: 'https://instagram.com/simeonpanda',
            followers: 8200000,
            engagement: 2.8,
            avgLikes: 200000,
            verified: true,
            pricing: { post: 50000, story: 25000 }
          },
          {
            platform: 'youtube',
            username: 'SimeonPanda',
            profileUrl: 'https://youtube.com/@SimeonPanda',
            followers: 2800000,
            engagement: 4.5,
            avgViews: 500000,
            verified: true,
            pricing: { video: 80000 }
          },
          {
            platform: 'tiktok',
            username: 'simeonpanda',
            profileUrl: 'https://tiktok.com/@simeonpanda',
            followers: 1500000,
            engagement: 5.8,
            verified: true
          }
        ],
        keywords: getKeywordIds(['fitness', 'gym', 'nutrition', 'wellness', 'motivation']),
        location: { country: 'UK', city: 'London' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '25-34',
          gender: { male: 75, female: 23, other: 2 }
        },
        status: 'available',
        bio: 'Natural bodybuilder and fitness entrepreneur. CEO of Just Lift.',
        rating: { average: 4.7, count: 95 },
        totalCollaborations: 85,
        isVerified: true,
        addedBy: adminUserId
      },

      // ===== FOOD =====
      {
        name: 'Gordon Ramsay',
        email: 'contact@gordonramsay.com',
        profileImage: 'https://yt3.googleusercontent.com/Bn-zM9FXg-wrGLJvE8S-fL_gwjUqQ3BzlJSjzIgwKgLwqkR7jMCm_CdkNiJqo9fD3gXpIFQy0Q=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'gordonramsay',
            profileUrl: 'https://youtube.com/@gordonramsay',
            followers: 21000000,
            engagement: 4.2,
            avgViews: 5000000,
            avgLikes: 200000,
            postsCount: 800,
            verified: true,
            pricing: { video: 300000 }
          },
          {
            platform: 'instagram',
            username: 'gordongram',
            profileUrl: 'https://instagram.com/gordongram',
            followers: 18000000,
            engagement: 2.5,
            avgLikes: 400000,
            verified: true,
            pricing: { post: 150000 }
          },
          {
            platform: 'tiktok',
            username: 'gordonramsayofficial',
            profileUrl: 'https://tiktok.com/@gordonramsayofficial',
            followers: 45000000,
            engagement: 6.8,
            avgViews: 12000000,
            verified: true
          },
          {
            platform: 'twitter',
            username: 'GordonRamsay',
            profileUrl: 'https://twitter.com/GordonRamsay',
            followers: 8000000,
            engagement: 1.8,
            verified: true
          }
        ],
        keywords: getKeywordIds(['food', 'cooking', 'recipes', 'entertainment']),
        location: { country: 'UK', city: 'London' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '25-34',
          gender: { male: 55, female: 43, other: 2 }
        },
        status: 'busy',
        bio: 'Michelin-starred chef, restaurateur, and TV personality. Its RAW!',
        rating: { average: 4.9, count: 350 },
        totalCollaborations: 120,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      // ===== MUSIC =====
      {
        name: 'Billie Eilish',
        email: 'contact@billieeilish.com',
        profileImage: 'https://instagram.fccu3-1.fna.fbcdn.net/v/t51.2885-19/358927087_272572075334973_4656547133879551003_n.jpg',
        platforms: [
          {
            platform: 'instagram',
            username: 'billieeilish',
            profileUrl: 'https://instagram.com/billieeilish',
            followers: 120000000,
            engagement: 2.2,
            avgLikes: 2500000,
            verified: true,
            pricing: { post: 800000 }
          },
          {
            platform: 'youtube',
            username: 'BillieEilish',
            profileUrl: 'https://youtube.com/@BillieEilish',
            followers: 50000000,
            engagement: 5.5,
            avgViews: 20000000,
            verified: true
          },
          {
            platform: 'tiktok',
            username: 'billieeilish',
            profileUrl: 'https://tiktok.com/@billieeilish',
            followers: 62000000,
            engagement: 7.2,
            avgViews: 15000000,
            verified: true
          },
          {
            platform: 'twitter',
            username: 'billieeilish',
            profileUrl: 'https://twitter.com/billieeilish',
            followers: 8200000,
            engagement: 1.5,
            verified: true
          }
        ],
        keywords: getKeywordIds(['music', 'entertainment', 'fashion', 'lifestyle']),
        location: { country: 'USA', state: 'California', city: 'Los Angeles' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '18-24',
          gender: { male: 35, female: 62, other: 3 }
        },
        status: 'busy',
        bio: 'Grammy-winning artist and singer-songwriter.',
        rating: { average: 4.9, count: 280 },
        totalCollaborations: 80,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      // ===== EDUCATION / SCIENCE =====
      {
        name: 'Mark Rober',
        email: 'contact@markrober.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_lGRc-05M2shaOvBx4-twsULBkorL1W3U2F6iq1rg=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'youtube',
            username: 'MarkRober',
            profileUrl: 'https://youtube.com/@MarkRober',
            followers: 28000000,
            engagement: 6.2,
            avgViews: 35000000,
            avgLikes: 2000000,
            avgComments: 80000,
            postsCount: 120,
            verified: true,
            pricing: { video: 400000 }
          },
          {
            platform: 'instagram',
            username: 'markrober',
            profileUrl: 'https://instagram.com/markrober',
            followers: 2100000,
            engagement: 4.8,
            avgLikes: 90000,
            verified: true,
            pricing: { post: 60000 }
          },
          {
            platform: 'twitter',
            username: 'MarkRober',
            profileUrl: 'https://twitter.com/MarkRober',
            followers: 1200000,
            engagement: 2.5,
            verified: true
          }
        ],
        keywords: getKeywordIds(['education', 'tech', 'tutorial', 'entertainment']),
        location: { country: 'USA', state: 'California' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '25-34',
          gender: { male: 72, female: 26, other: 2 }
        },
        status: 'available',
        bio: 'Former NASA engineer. Making science fun one video at a time.',
        rating: { average: 4.9, count: 200 },
        totalCollaborations: 45,
        isVerified: true,
        isFeatured: true,
        addedBy: adminUserId
      },

      // ===== BUSINESS / ENTREPRENEURSHIP =====
      {
        name: 'Gary Vaynerchuk',
        email: 'contact@garyvee.com',
        profileImage: 'https://yt3.googleusercontent.com/ytc/AIdro_kpQLlfJL8SB-VLRinz5WQlyxHv21WyaBhGH-Y=s176-c-k-c0x00ffffff-no-rj',
        platforms: [
          {
            platform: 'instagram',
            username: 'garyvee',
            profileUrl: 'https://instagram.com/garyvee',
            followers: 10500000,
            engagement: 3.2,
            avgLikes: 300000,
            verified: true,
            pricing: { post: 100000, story: 50000 }
          },
          {
            platform: 'youtube',
            username: 'GaryVee',
            profileUrl: 'https://youtube.com/@GaryVee',
            followers: 4500000,
            engagement: 4.5,
            avgViews: 500000,
            verified: true,
            pricing: { video: 150000 }
          },
          {
            platform: 'tiktok',
            username: 'garyvee',
            profileUrl: 'https://tiktok.com/@garyvee',
            followers: 18000000,
            engagement: 5.8,
            avgViews: 3000000,
            verified: true
          },
          {
            platform: 'twitter',
            username: 'garyvee',
            profileUrl: 'https://twitter.com/garyvee',
            followers: 3200000,
            engagement: 1.8,
            verified: true
          },
          {
            platform: 'linkedin',
            username: 'garyvaynerchuk',
            profileUrl: 'https://linkedin.com/in/garyvaynerchuk',
            followers: 5200000,
            engagement: 2.5,
            verified: true
          }
        ],
        keywords: getKeywordIds(['business', 'entrepreneur', 'motivation', 'investing']),
        location: { country: 'USA', state: 'New York', city: 'New York City' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '25-34',
          gender: { male: 68, female: 30, other: 2 }
        },
        status: 'available',
        bio: 'CEO of VaynerMedia. Serial entrepreneur. NFT enthusiast.',
        rating: { average: 4.6, count: 180 },
        totalCollaborations: 200,
        isVerified: true,
        addedBy: adminUserId
      },

      {
        name: 'Satya Nadella',
        email: 'contact@microsoft.com',
        profileImage: 'https://pbs.twimg.com/profile_images/1221837516816306177/_Ld4un5A_400x400.jpg',
        platforms: [
          {
            platform: 'linkedin',
            username: 'satyanadella',
            profileUrl: 'https://linkedin.com/in/satyanadella',
            followers: 12000000,
            engagement: 3.5,
            avgLikes: 100000,
            verified: true
          },
          {
            platform: 'twitter',
            username: 'satloopyanadella',
            profileUrl: 'https://twitter.com/satyanadella',
            followers: 3500000,
            engagement: 2.2,
            verified: true
          }
        ],
        keywords: getKeywordIds(['tech', 'business', 'ai', 'entrepreneur']),
        location: { country: 'USA', state: 'Washington', city: 'Seattle' },
        languages: ['English'],
        demographics: {
          primaryAgeRange: '35-44',
          gender: { male: 75, female: 23, other: 2 }
        },
        status: 'unavailable',
        bio: 'CEO of Microsoft. Author of Hit Refresh.',
        rating: { average: 4.8, count: 50 },
        totalCollaborations: 20,
        isVerified: true,
        addedBy: adminUserId
      }
    ];

    // Insert influencers
    const result = await Influencer.insertMany(influencersData);
    console.log(`Successfully inserted ${result.length} influencers`);

    // Log summary
    console.log('\n=== Seeding Summary ===');
    console.log(`Total influencers: ${result.length}`);
    console.log('Categories covered: Tech, Gaming, Entertainment, Sports, Beauty, Fashion, Food, Fitness, Business, Music, Education');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding influencers:', error);
    process.exit(1);
  }
};

// Run with: node seeders/influencerSeeder.js
seedInfluencers();