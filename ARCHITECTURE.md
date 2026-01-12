# Snappi Backend - System Architecture

## Overview
Snappi is a full-featured influencer marketing platform backend built with Node.js, Express, and MongoDB. This document outlines the system architecture, data models, and key design decisions.

## Technology Stack

### Core Technologies
- **Runtime**: Node.js v14+
- **Framework**: Express.js 4.x
- **Database**: MongoDB 4.4+
- **ODM**: Mongoose 8.x
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

### Security & Middleware
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **express-rate-limit**: Rate limiting
- **express-validator**: Input validation
- **Morgan**: HTTP request logging

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  (Frontend: React/Vue/Angular, Mobile Apps, Postman)        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│                    Express.js Server                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Middleware Layer                        │   │
│  │  • Helmet (Security)                                 │   │
│  │  • CORS                                              │   │
│  │  • Rate Limiting                                     │   │
│  │  • Body Parser                                       │   │
│  │  • Morgan (Logging)                                  │   │
│  │  • JWT Authentication                                │   │
│  │  • Error Handler                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Route Layer                             │   │
│  │  • /api/auth        - Authentication                 │   │
│  │  • /api/influencers - Influencer Management          │   │
│  │  • /api/campaigns   - Campaign Management            │   │
│  │  • /api/dashboard   - Analytics & Stats              │   │
│  │  • /health          - Health Check                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Controller Layer                          │   │
│  │  • authController                                    │   │
│  │  • influencerController                              │   │
│  │  • campaignController                                │   │
│  │  • dashboardController                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Model Layer (Mongoose)                  │   │
│  │  • User                                              │   │
│  │  • Influencer                                        │   │
│  │  • Campaign                                          │   │
│  │  • CampaignInfluencer                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└────────────────────────┬────────────────────────────────────┘
                         │ Mongoose ODM
┌────────────────────────▼───────────────────────────────────┐
│                    MongoDB Database                        │
│                                                            │
│  Collections:                                              │
│  • users                                                   │
│  • influencers                                             │
│  • campaigns                                               │
│  • campaigninfluencers                                     │
└────────────────────────────────────────────────────────────┘
```

## Data Models & Relationships

```
┌────────────────┐
│     User       │
│ ─────────────  │
│ _id            │──┐
│ name           │  │
│ email          │  │ (One-to-Many)
│ password       │  │ Creates
│ role           │  │
│ company        │  │
└────────────────┘  │
                    │
                    ▼
        ┌───────────────────┐         ┌─────────────────┐
        │    Influencer     │         │    Campaign     │
        │ ───────────────   │         │ ─────────────   │
        │ _id               │◄────┐   │ _id             │
        │ name              │     │   │ name            │
        │ platform          │     │   │ objective       │
        │ followers         │     │   │ budget          │
        │ engagement        │     │   │ status          │
        │ niche             │     │   │ performance     │
        │ addedBy (User)    │     │   │ createdBy(User) │
        └───────────────────┘     │   └─────────────────┘
                    │             │             │
                    │             │             │
                    │   ┌─────────┴─────────┐   │
                    └───┤CampaignInfluencer │───┘
                        │ ───────────────   │
                        │ campaign          │
                        │ influencer        │
                        │ status            │
                        │ compensation      │
                        │ performance       │
                        │ deliverables      │
                        └───────────────────┘
```

### Relationships

1. **User → Campaign** (One-to-Many)
   - One user (brand) can create multiple campaigns

2. **User → Influencer** (One-to-Many)
   - One user can add multiple influencers to the system

3. **Campaign ↔ Influencer** (Many-to-Many via CampaignInfluencer)
   - One campaign can have multiple influencers
   - One influencer can be part of multiple campaigns
   - CampaignInfluencer serves as a junction table with additional data

## Core Features

### 1. Authentication & Authorization
- **JWT-based authentication**
  - Token generation on login
  - Token validation on protected routes
- **Role-based access control**
  - Brand users: Can manage their own campaigns
  - Admin users: Full system access
- **Password security**
  - bcrypt hashing with salt rounds
  - Password strength validation

### 2. Influencer Management
- **CRUD operations** for influencer profiles
- **Advanced search & filtering**
  - Text search on name, username, niche
  - Filter by platform, followers, engagement
  - Sort by multiple fields
- **Influencer metrics**
  - Followers count
  - Engagement rate
  - Average views
  - Match score
- **Demographics tracking**
  - Age range
  - Gender distribution
  - Geographic data

### 3. Campaign Management
- **Campaign lifecycle management**
  - Draft → Active → Completed/Paused/Cancelled
- **Budget tracking**
  - Total budget
  - Spent amount
  - Remaining budget (auto-calculated)
- **Performance metrics**
  - Total reach
  - Engagement
  - ROI calculation
- **Deliverables tracking**
  - Types: posts, stories, reels, videos
  - Approval workflow

### 4. Performance Tracking
- **Campaign-level metrics**
  - Aggregated performance across all influencers
  - ROI calculations
- **Influencer-level metrics**
  - Individual performance per campaign
  - Engagement rates
  - Click tracking
  - Conversion tracking

### 5. Dashboard & Analytics
- **Campaign overview**
  - Active campaigns count
  - Total spend
  - Average ROI
- **Influencer statistics**
  - Total influencers
  - Average engagement
  - Platform distribution
- **Performance trends**
  - Month-over-month comparisons
  - Growth metrics

## API Design Principles

### RESTful Architecture
- Resource-based URLs
- HTTP methods (GET, POST, PUT, DELETE)
- Standard status codes
- JSON request/response format

### Pagination
```javascript
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error Handling
- Consistent error response format
- Descriptive error messages
- Appropriate HTTP status codes
- Development mode: Stack traces included

### Security Features

1. **Authentication**
   - JWT tokens with expiration
   - Secure password hashing
   - Token-based authorization

2. **Rate Limiting**
   - Prevents brute force attacks
   - Configurable limits per IP

3. **Input Validation**
   - Schema validation with Mongoose
   - Request validation
   - XSS prevention

4. **CORS**
   - Configurable allowed origins
   - Credentials support

5. **Security Headers**
   - Helmet middleware for HTTP headers
   - Protection against common vulnerabilities

## Database Design

### Indexes
```javascript
// Influencer model
- Text index: name, username, niche, categories
- Compound index: platform + followers (desc)
- Single index: engagement (desc)

// Campaign model
- Compound index: status + createdBy
- Compound index: startDate + endDate

// CampaignInfluencer model
- Unique compound index: campaign + influencer
- Compound index: campaign + status
- Compound index: influencer + status
```

### Data Consistency
- Pre-save hooks for calculations
- Referential integrity with ObjectId references
- Cascade deletions where appropriate

## Scalability Considerations

### Database
- MongoDB indexes for query optimization
- Pagination to limit result sets
- Aggregation pipelines for complex queries

### API
- Rate limiting to prevent abuse
- Stateless authentication (JWT)
- Horizontal scaling ready (no session storage)

### Monitoring
- Morgan for HTTP request logging
- Error logging and tracking
- Health check endpoint

## Future Enhancements

### Short-term
- [ ] Email notifications
- [ ] File upload for media
- [ ] Bulk operations
- [ ] Export to CSV/Excel

### Medium-term
- [ ] Social media API integrations
- [ ] Advanced analytics dashboard
- [ ] Payment processing
- [ ] Contract management

### Long-term
- [ ] Machine learning for influencer matching
- [ ] Real-time collaboration features
- [ ] Multi-language support
- [ ] White-label solution

## Performance Optimizations

1. **Database Queries**
   - Use select() to limit fields
   - Populate only necessary relations
   - Index frequently queried fields

2. **Response Size**
   - Pagination for list endpoints
   - Field filtering options
   - Compressed responses

3. **Caching Strategy** (Future)
   - Redis for session management
   - Cache frequently accessed data
   - Invalidation strategy

## Deployment Considerations

### Environment Variables
```
PORT                    # Server port
MONGODB_URI            # Database connection string
JWT_SECRET             # JWT signing secret
JWT_EXPIRE             # Token expiration time
ALLOWED_ORIGINS        # CORS allowed origins
RATE_LIMIT_WINDOW_MS   # Rate limit window
RATE_LIMIT_MAX_REQUESTS # Max requests per window
```

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Use strong JWT_SECRET
- [ ] Configure MongoDB with authentication
- [ ] Set up SSL/TLS
- [ ] Enable compression
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Implement CI/CD pipeline

## Testing Strategy (Recommended)

### Unit Tests
- Model validations
- Helper functions
- Middleware logic

### Integration Tests
- API endpoint testing
- Database operations
- Authentication flow

### Tools
- Jest / Mocha
- Supertest
- MongoDB Memory Server

## Documentation

### Available Documentation
1. **README.md** - Complete API documentation
2. **QUICKSTART.md** - Quick setup guide
3. **API_REFERENCE.md** - Endpoint reference
4. **ARCHITECTURE.md** - This document
5. **Postman Collection** - API testing collection

## Support & Maintenance

### Logging
- HTTP request logging (Morgan)
- Error logging
- Database operation logs

### Monitoring
- Health check endpoint
- Performance metrics
- Error tracking

### Updates
- Regular dependency updates
- Security patches
- Feature enhancements based on feedback

---

## Summary

The Snappi backend is designed with:
- **Scalability** in mind through stateless architecture
- **Security** as a priority with JWT, rate limiting, and validation
- **Maintainability** through clean code structure and documentation
- **Performance** optimization through indexes and pagination
- **Extensibility** for future feature additions

This architecture provides a solid foundation for an influencer marketing platform that can grow with your business needs.
