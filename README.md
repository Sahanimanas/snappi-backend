# Snappi Backend API

A comprehensive backend API for an influencer marketing platform built with Node.js, Express.js, and MongoDB.

## Features

- 🔐 **Authentication & Authorization** - JWT-based authentication with role-based access control
- 👥 **Influencer Management** - CRUD operations for influencer profiles with advanced search and filtering
- 📊 **Campaign Management** - Complete campaign lifecycle management
- 📈 **Performance Tracking** - Track campaign and influencer performance metrics
- 🎯 **Dashboard Analytics** - Real-time statistics and insights
- 🔍 **Advanced Search** - Text search, filters, and pagination
- 🛡️ **Security** - Helmet, CORS, rate limiting, and input validation
- 📝 **Logging** - Morgan for HTTP request logging

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd snappi-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configurations:
```env
PORT=8080
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/snappi
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running
mongod
```

5. **Run the server**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start at `http://localhost:8080`

## API Documentation

### Base URL
```
http://localhost:8080/api
```

### Authentication

All authenticated routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "company": "Acme Inc",
  "phoneNumber": "+1234567890",
  "role": "brand"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "brand"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Update User Details
```http
PUT /api/auth/updatedetails
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "company": "New Company"
}
```

#### Update Password
```http
PUT /api/auth/updatepassword
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

### Influencers

#### Get All Influencers
```http
GET /api/influencers?page=1&limit=10&platform=instagram&minFollowers=5000
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Text search
- `platform` - Filter by platform (instagram, youtube, tiktok, etc.)
- `niche` - Filter by niche
- `status` - Filter by status (available, busy, unavailable)
- `minFollowers` - Minimum followers
- `maxFollowers` - Maximum followers
- `minEngagement` - Minimum engagement rate
- `maxEngagement` - Maximum engagement rate
- `country` - Filter by country
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - Sort order (asc, desc)

#### Get Single Influencer
```http
GET /api/influencers/:id
Authorization: Bearer <token>
```

#### Create Influencer
```http
POST /api/influencers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "username": "@janesmith",
  "email": "jane@example.com",
  "platform": "instagram",
  "profileUrl": "https://instagram.com/janesmith",
  "followers": 50000,
  "engagement": 4.5,
  "avgViews": 10000,
  "niche": ["fashion", "lifestyle"],
  "country": "USA",
  "status": "available",
  "bio": "Fashion and lifestyle influencer"
}
```

#### Update Influencer
```http
PUT /api/influencers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "followers": 55000,
  "engagement": 5.0,
  "status": "busy"
}
```

#### Delete Influencer
```http
DELETE /api/influencers/:id
Authorization: Bearer <token>
```

#### Get Influencer Statistics
```http
GET /api/influencers/stats/overview
Authorization: Bearer <token>
```

### Campaigns

#### Get All Campaigns
```http
GET /api/campaigns?page=1&limit=10&status=active
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - Filter by status (draft, active, paused, completed, cancelled)
- `search` - Search by campaign name
- `sortBy` - Sort field
- `sortOrder` - Sort order

#### Get Single Campaign
```http
GET /api/campaigns/:id
Authorization: Bearer <token>
```

#### Create Campaign
```http
POST /api/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Summer Fashion Launch",
  "description": "Promote our new summer collection",
  "objective": "brand_awareness",
  "campaignType": "sponsored_post",
  "status": "draft",
  "budget": {
    "total": 5000
  },
  "targetPlatforms": ["instagram", "tiktok"],
  "demographics": {
    "ageRange": ["18-24", "25-34"],
    "gender": ["all"],
    "location": {
      "countries": ["USA", "Canada"]
    }
  },
  "compensationType": "monetary",
  "deliverables": [
    {
      "type": "post",
      "quantity": 2,
      "description": "Instagram feed posts"
    }
  ],
  "startDate": "2024-06-01",
  "endDate": "2024-07-31"
}
```

#### Update Campaign
```http
PUT /api/campaigns/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active",
  "budget": {
    "total": 6000,
    "spent": 1000
  }
}
```

#### Delete Campaign
```http
DELETE /api/campaigns/:id
Authorization: Bearer <token>
```

#### Add Influencer to Campaign
```http
POST /api/campaigns/:id/influencers
Authorization: Bearer <token>
Content-Type: application/json

{
  "influencerId": "507f1f77bcf86cd799439011",
  "compensation": {
    "amount": 500,
    "type": "monetary"
  },
  "trackingLink": "https://track.snappi.com/campaign/influencer"
}
```

#### Get Campaign Performance
```http
GET /api/campaigns/:id/performance
Authorization: Bearer <token>
```

#### Get Campaign Statistics
```http
GET /api/campaigns/stats/overview
Authorization: Bearer <token>
```

### Dashboard

#### Get Dashboard Overview
```http
GET /api/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "activeCampaigns": 3,
      "totalReach": 2400000,
      "campaignROI": 245,
      "totalSpend": 5000,
      "activeCollaborations": 8
    },
    "changes": {
      "activeCampaigns": "+5.0",
      "totalReach": "+23.5",
      "roi": "-12.3",
      "spend": "+8.2"
    },
    "recentCampaigns": [...],
    "topPerformingInfluencers": [...]
  }
}
```

#### Get Influencer Dashboard
```http
GET /api/dashboard/influencers
Authorization: Bearer <token>
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-10T12:00:00.000Z"
}
```

## Data Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (brand, admin),
  company: String,
  phoneNumber: String,
  isActive: Boolean,
  timestamps: true
}
```

### Influencer
```javascript
{
  name: String,
  username: String,
  email: String,
  platform: String,
  profileUrl: String,
  profileImage: String,
  followers: Number,
  engagement: Number,
  avgViews: Number,
  matchScore: Number,
  niche: [String],
  categories: [String],
  country: String,
  city: String,
  demographics: Object,
  status: String,
  pricing: Object,
  verified: Boolean,
  rating: Number,
  totalCollaborations: Number,
  addedBy: ObjectId (User),
  timestamps: true
}
```

### Campaign
```javascript
{
  name: String,
  description: String,
  objective: String,
  campaignType: String,
  status: String,
  budget: Object,
  targetPlatforms: [String],
  demographics: Object,
  compensationType: String,
  kpis: Object,
  deliverables: [Object],
  startDate: Date,
  endDate: Date,
  performance: Object,
  influencers: [ObjectId],
  createdBy: ObjectId (User),
  timestamps: true
}
```

### CampaignInfluencer
```javascript
{
  campaign: ObjectId,
  influencer: ObjectId,
  status: String,
  compensation: Object,
  trackingLink: String,
  deliverables: [Object],
  performance: Object,
  notes: String,
  invitedAt: Date,
  acceptedAt: Date,
  completedAt: Date,
  timestamps: true
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Error Response Format:
```json
{
  "success": false,
  "message": "Error message here"
}
```

## Security Features

1. **Password Hashing** - bcrypt with salt rounds
2. **JWT Authentication** - Secure token-based auth
3. **Rate Limiting** - Prevents brute force attacks
4. **Helmet** - Sets security headers
5. **CORS** - Configured cross-origin resource sharing
6. **Input Validation** - Validates all user inputs
7. **MongoDB Injection Prevention** - Mongoose sanitization

## Development

### Project Structure
```
snappi-backend/
├── config/
│   └── database.js
├── controllers/
│   ├── authController.js
│   ├── campaignController.js
│   ├── dashboardController.js
│   └── influencerController.js
├── middleware/
│   ├── auth.js
│   └── errorHandler.js
├── models/
│   ├── Campaign.js
│   ├── CampaignInfluencer.js
│   ├── Influencer.js
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   ├── campaignRoutes.js
│   ├── dashboardRoutes.js
│   └── influencerRoutes.js
├── utils/
│   └── helpers.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## Testing

You can test the API using tools like:
- Postman
- Insomnia
- cURL
- Thunder Client (VS Code extension)

## Future Enhancements

- [ ] Email verification
- [ ] Password reset functionality
- [ ] File upload for influencer profiles
- [ ] Social media API integrations
- [ ] Advanced analytics and reporting
- [ ] Webhook support for real-time updates
- [ ] Payment integration
- [ ] Notification system
- [ ] Multi-language support

## License

ISC

## Support

For support, email support@snappi.com or create an issue in the repository.
