# Snappi Backend - Quick Start Guide

## Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd snappi-backend
npm install
```

### Step 2: Setup Environment
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and update if needed (default values work for local development)
```

### Step 3: Start MongoDB
Make sure MongoDB is running on your system:
```bash
# If using MongoDB locally
mongod

# Or if using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 4: Seed the Database (Optional but Recommended)
```bash
npm run seed
```

This will create:
- A test user (email: brand@test.com, password: password123)
- 5 sample influencers
- 2 sample campaigns
- Sample campaign-influencer relationships

### Step 5: Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

The server will start at `http://localhost:8080`

## Quick Test

### 1. Check if server is running:
```bash
curl http://localhost:8080/health
```

### 2. Login to get a token:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "brand@test.com",
    "password": "password123"
  }'
```

### 3. Get influencers (replace TOKEN with your JWT):
```bash
curl http://localhost:8080/api/influencers \
  -H "Authorization: Bearer TOKEN"
```

## Using Postman

1. Import the `Snappi_API.postman_collection.json` file into Postman
2. Update the `base_url` variable if needed (default: http://localhost:8080/api)
3. Run the "Login" request first - it will automatically save the token
4. All other requests will use the saved token automatically

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Seed database with sample data
npm run seed

# Delete all data from database
npm run seed:delete
```

## Project Structure

```
snappi-backend/
├── config/          # Database configuration
├── controllers/     # Request handlers
├── middleware/      # Auth, error handling
├── models/          # Database schemas
├── routes/          # API routes
├── utils/           # Helper functions
├── .env.example     # Environment variables template
├── server.js        # Main entry point
├── seeder.js        # Database seeder
└── README.md        # Full documentation
```

## API Endpoints Overview

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password

### Influencers
- `GET /api/influencers` - Get all influencers (with filters)
- `GET /api/influencers/:id` - Get single influencer
- `POST /api/influencers` - Create influencer
- `PUT /api/influencers/:id` - Update influencer
- `DELETE /api/influencers/:id` - Delete influencer
- `GET /api/influencers/stats/overview` - Get influencer stats

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:id` - Get single campaign
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/influencers` - Add influencer to campaign
- `GET /api/campaigns/:id/performance` - Get campaign performance
- `GET /api/campaigns/stats/overview` - Get campaign stats

### Dashboard
- `GET /api/dashboard` - Get dashboard overview
- `GET /api/dashboard/influencers` - Get influencer dashboard

## Default Login Credentials (After Seeding)

```
Email: brand@test.com
Password: password123
```

## Need Help?

- Check the full `README.md` for detailed documentation
- All API endpoints are documented with examples
- Use the Postman collection for easy testing
- Check error messages - they're descriptive and helpful

## Next Steps

1. ✅ Test all endpoints using Postman
2. ✅ Explore the dashboard endpoints
3. ✅ Try creating your own campaigns
4. ✅ Add more influencers
5. ✅ Connect your frontend application
6. ✅ Customize the models for your needs
7. ✅ Add more features as needed

Happy coding! 🚀
