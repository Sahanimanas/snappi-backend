# Snappi API - Endpoints Quick Reference

## Base URL
```
http://localhost:8080/api
```

## Authentication Required
All endpoints except `/auth/register` and `/auth/login` require JWT token:
```
Authorization: Bearer <your-token>
```

---

## 🔐 Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login user | ❌ |
| GET | `/auth/me` | Get current user | ✅ |
| GET | `/auth/logout` | Logout user | ✅ |
| PUT | `/auth/updatedetails` | Update user details | ✅ |
| PUT | `/auth/updatepassword` | Update password | ✅ |

---

## 👥 Influencers

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/influencers` | Get all influencers | ✅ |
| GET | `/influencers/:id` | Get single influencer | ✅ |
| POST | `/influencers` | Create influencer | ✅ |
| PUT | `/influencers/:id` | Update influencer | ✅ |
| DELETE | `/influencers/:id` | Delete influencer | ✅ |
| GET | `/influencers/stats/overview` | Get influencer statistics | ✅ |

### Influencer Query Parameters
```
?page=1                    # Page number
&limit=10                  # Items per page
&search=fashion            # Text search
&platform=instagram        # Filter by platform
&niche=fashion             # Filter by niche
&status=available          # Filter by status
&minFollowers=5000         # Minimum followers
&maxFollowers=100000       # Maximum followers
&minEngagement=3.0         # Minimum engagement rate
&maxEngagement=10.0        # Maximum engagement rate
&country=USA               # Filter by country
&sortBy=followers          # Sort field
&sortOrder=desc            # Sort order (asc/desc)
```

---

## 📊 Campaigns

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/campaigns` | Get all campaigns | ✅ |
| GET | `/campaigns/:id` | Get single campaign | ✅ |
| POST | `/campaigns` | Create campaign | ✅ |
| PUT | `/campaigns/:id` | Update campaign | ✅ |
| DELETE | `/campaigns/:id` | Delete campaign | ✅ |
| POST | `/campaigns/:id/influencers` | Add influencer to campaign | ✅ |
| GET | `/campaigns/:id/performance` | Get campaign performance | ✅ |
| GET | `/campaigns/stats/overview` | Get campaign statistics | ✅ |

### Campaign Query Parameters
```
?page=1                    # Page number
&limit=10                  # Items per page
&status=active             # Filter by status
&search=summer             # Search by name
&sortBy=createdAt          # Sort field
&sortOrder=desc            # Sort order
```

### Campaign Status Values
```
draft, active, paused, completed, cancelled
```

### Campaign Objectives
```
brand_awareness, increase_sales, engagement, lead_generation, traffic
```

### Campaign Types
```
sponsored_post, product_review, giveaway, brand_ambassador, affiliate
```

---

## 📈 Dashboard

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/dashboard` | Get dashboard overview | ✅ |
| GET | `/dashboard/influencers` | Get influencer dashboard | ✅ |

---

## 🏥 System

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | ❌ |

---

## 📝 Request Examples

### Register User
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "company": "Acme Inc",
  "role": "brand"
}
```

### Create Influencer
```json
POST /api/influencers
{
  "name": "Jane Smith",
  "username": "@janesmith",
  "email": "jane@example.com",
  "platform": "instagram",
  "followers": 50000,
  "engagement": 4.5,
  "niche": ["fashion", "lifestyle"],
  "country": "USA",
  "status": "available"
}
```

### Create Campaign
```json
POST /api/campaigns
{
  "name": "Summer Fashion Launch",
  "description": "Promote summer collection",
  "objective": "brand_awareness",
  "campaignType": "sponsored_post",
  "status": "active",
  "budget": {
    "total": 5000
  },
  "targetPlatforms": ["instagram"],
  "demographics": {
    "ageRange": ["18-24", "25-34"],
    "gender": ["all"]
  },
  "compensationType": "monetary"
}
```

### Add Influencer to Campaign
```json
POST /api/campaigns/:campaignId/influencers
{
  "influencerId": "60d5ec49f1b2c72b8c8e4a1b",
  "compensation": {
    "amount": 500,
    "type": "monetary"
  },
  "trackingLink": "https://track.example.com/link"
}
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "count": 10,
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## 🔢 HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## 🗂️ Enums & Constants

### Platforms
```
instagram, youtube, tiktok, facebook, twitter, linkedin, pinterest
```

### Influencer Status
```
available, busy, unavailable
```

### Compensation Types
```
monetary, product, both, affiliate
```

### Deliverable Types
```
post, story, reel, video, blog, review
```

### Age Ranges
```
13-17, 18-24, 25-34, 35-44, 45-54, 55+
```

### User Roles
```
brand, admin
```

---

## 💡 Tips

1. **Pagination**: Most list endpoints support pagination with `?page=1&limit=10`
2. **Search**: Use `?search=keyword` for text search on influencers
3. **Filters**: Combine multiple query parameters for advanced filtering
4. **Sorting**: Use `?sortBy=field&sortOrder=asc` or `desc`
5. **Token**: Save the JWT token from login response for subsequent requests
6. **Authorization**: Always include `Authorization: Bearer <token>` header

---

## 🔗 Resources

- Full Documentation: `README.md`
- Quick Start Guide: `QUICKSTART.md`
- Postman Collection: `Snappi_API.postman_collection.json`

---

Last Updated: January 2025
