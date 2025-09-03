# Supabase MCP Integration for Domino Score App

This integration provides a complete Supabase + MCP (Model Context Protocol) setup for your Domino Score application, enabling AI assistants to interact with your Supabase database and authentication system.

## Features

### Database Operations
- Query database with custom SQL
- Insert, update, and delete data
- Get user profiles and game history
- Access billing information

### Authentication
- User registration and login
- Session management
- Profile management

### Game Management
- Create and update games
- Track game sessions
- Leaderboard functionality
- Player statistics

## Setup Instructions

### 1. Environment Variables

Add these environment variables to your `.env` file:

```env
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### 2. Database Setup

Run the SQL schema in your Supabase dashboard:

```bash
# Copy the contents of database/schema.sql and run in Supabase SQL Editor
```

### 3. MCP Server Setup

1. Install dependencies for the MCP server:
```bash
npm install @modelcontextprotocol/sdk@^0.4.0
```

2. Configure your MCP client (e.g., Claude Desktop) to use the server:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/path/to/your/supabase-mcp-server.js"],
      "env": {
        "PUBLIC_SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_ROLE": "your-supabase-service-role-key"
      }
    }
  }
}
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/session` - Get current session

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Games
- `GET /api/games` - Get user's games
- `POST /api/games` - Create new game
- `GET /api/games/[id]` - Get specific game
- `PUT /api/games/[id]` - Update game
- `DELETE /api/games/[id]` - Delete game

### Billing (Existing)
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/portal` - Create billing portal session

### Other
- `GET /api/leaderboard` - Get leaderboard data
- `GET /api/public-env` - Get public environment variables

## MCP Tools Available

### Database Tools
- `query_database` - Execute custom SQL queries
- `insert_data` - Insert data into tables
- `update_data` - Update existing data
- `delete_data` - Delete data from tables

### User Management Tools
- `get_user_profile` - Get user profile information
- `get_user_games` - Get user's game history
- `get_user_billing` - Get user's billing information

### Game Management Tools
- `create_game` - Create a new game record
- `update_game` - Update an existing game
- `get_leaderboard` - Get leaderboard data

### Authentication Tools
- `authenticate_user` - Login a user
- `register_user` - Register a new user

## Usage Examples

### Creating a Game via MCP
```javascript
// The MCP server will handle this automatically when you use the create_game tool
{
  "userId": "user-uuid",
  "gameType": "dominoes",
  "players": ["Player 1", "Player 2"],
  "initialData": { "startingScore": 100 }
}
```

### Querying User Data
```sql
-- Example query via MCP query_database tool
SELECT * FROM user_profiles WHERE user_id = 'user-uuid';
```

### Authentication Flow
```javascript
// Register user
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "player123",
  "fullName": "John Doe"
}

// Login user
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

## Security Notes

- All API endpoints require proper authentication
- Row Level Security (RLS) is enabled on all tables
- Service role key is used for server-side operations
- User data is properly isolated by user_id

## Database Schema

The schema includes:
- `user_profiles` - User profile information
- `games` - Game records and scores
- `game_sessions` - Active game sessions
- `leaderboard` - Computed leaderboard data
- `user_billing` - Stripe billing information (existing)

## Next Steps

1. Set up your Supabase project and run the schema
2. Configure environment variables
3. Test the API endpoints
4. Configure your MCP client to use the server
5. Start building your frontend application

This integration provides a complete backend solution for your Domino Score app with AI assistant capabilities!
