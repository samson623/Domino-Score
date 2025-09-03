# Team System with Automatic Player Synchronization

## Overview

This document describes the implementation of a comprehensive team system that automatically synchronizes team members with associated games. When a team is established, all team members are automatically synchronized to any games created for that team, ensuring consistent player data across the application.

## Features

### Core Functionality
- **Team Creation & Management**: Create, update, and delete teams
- **Member Management**: Add, remove, and manage team members with role-based permissions
- **Automatic Player Synchronization**: Team members are automatically synchronized to team games
- **Real-time Updates**: Changes to team membership or user profiles automatically update associated games
- **Role-based Access Control**: Owner, admin, and member roles with appropriate permissions

### Key Benefits
- **Data Consistency**: Ensures player information is always up-to-date across all team games
- **Reduced Manual Work**: Eliminates need to manually update player lists when team changes occur
- **Scalability**: Handles multiple teams and games efficiently
- **Reliability**: Built-in error handling and edge case management

## Database Schema

### New Tables

#### `teams`
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `team_memberships`
```sql
CREATE TABLE team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(team_id, user_id)
);
```

#### `team_games`
```sql
CREATE TABLE team_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, game_id)
);
```

### Synchronization Functions

#### Automatic Owner Membership
```sql
CREATE OR REPLACE FUNCTION add_team_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_memberships (team_id, user_id, role, is_active)
  VALUES (NEW.id, NEW.owner_id, 'owner', true)
  ON CONFLICT (team_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Player Synchronization
```sql
CREATE OR REPLACE FUNCTION sync_team_players_to_games()
RETURNS TRIGGER AS $$
DECLARE
  team_members JSONB;
  game_record RECORD;
BEGIN
  -- Get all active team members with their profile information
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', tm.user_id,
      'username', up.username,
      'full_name', up.full_name,
      'avatar_url', up.avatar_url,
      'role', tm.role
    )
  ) INTO team_members
  FROM team_memberships tm
  JOIN user_profiles up ON tm.user_id = up.user_id
  WHERE tm.team_id = NEW.team_id AND tm.is_active = true;

  -- Update all games associated with this team
  FOR game_record IN 
    SELECT g.id 
    FROM games g
    JOIN team_games tg ON g.id = tg.game_id
    WHERE tg.team_id = NEW.team_id
  LOOP
    UPDATE games 
    SET 
      players = team_members,
      updated_at = NOW()
    WHERE id = game_record.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## API Endpoints

### Teams Management

#### `GET /api/teams`
Retrieve user's teams

**Response:**
```json
{
  "teams": [
    {
      "team_id": "uuid",
      "team_name": "Team Name",
      "description": "Team description",
      "owner_id": "uuid",
      "avatar_url": "url",
      "is_active": true,
      "max_members": 10,
      "member_count": 5,
      "user_role": "owner",
      "created_at": "timestamp"
    }
  ]
}
```

#### `POST /api/teams`
Create a new team

**Request:**
```json
{
  "name": "Team Name",
  "description": "Optional description",
  "avatar_url": "Optional avatar URL",
  "max_members": 10
}
```

#### `GET /api/teams/[id]`
Get team details with members

#### `PUT /api/teams/[id]`
Update team (owner only)

#### `DELETE /api/teams/[id]`
Delete team (owner only)

### Member Management

#### `GET /api/teams/[id]/members`
Get team members

#### `POST /api/teams/[id]/members`
Add team member (owner/admin only)

**Request:**
```json
{
  "user_id": "uuid",
  "role": "member" // or "admin"
}
```

#### `PUT /api/teams/[id]/members?user_id=uuid`
Update member role (owner/admin only)

#### `DELETE /api/teams/[id]/members?user_id=uuid`
Remove member (owner/admin only)

### Team Games

#### `POST /api/games`
Create team game with automatic player synchronization

**Request:**
```json
{
  "gameType": "domino",
  "teamId": "uuid", // Optional - enables team sync
  "initialData": {}
}
```

## Synchronization Behavior

### When Team is Created
1. Team owner is automatically added as a member with 'owner' role
2. Team is ready to accept additional members

### When Members are Added/Removed
1. Database trigger `sync_team_players_on_membership_change` fires
2. All games associated with the team are updated with current member list
3. Player data includes: id, username, full_name, avatar_url, role

### When User Profile is Updated
1. Database trigger `sync_team_players_on_profile_change` fires
2. All team games where user is a member are updated with new profile data
3. Ensures consistent user information across all games

### When Team Game is Created
1. If `teamId` is provided, system validates user membership
2. Current team members are automatically set as game players
3. Team-game association is created in `team_games` table

## Security & Permissions

### Row Level Security (RLS)
- All team tables have RLS enabled
- Users can only access teams they are members of
- Team owners have full control over their teams
- Admins can manage members but not modify team settings

### Role Hierarchy
1. **Owner**: Full team control, cannot be removed
2. **Admin**: Can manage members, cannot modify team or promote to admin
3. **Member**: Can view team and participate in games

### Validation Rules
- Team names: 1-100 characters
- Descriptions: max 500 characters
- Max members: 2-50 range
- Cannot remove team owner
- Cannot exceed max member limit

## Error Handling

### Edge Cases Handled
- **Team Full**: Prevents adding members when max capacity reached
- **Invalid Permissions**: Proper authorization checks for all operations
- **Orphaned Data**: Cascade deletes prevent orphaned records
- **Concurrent Updates**: Database constraints prevent race conditions
- **Profile Sync Failures**: Graceful handling of sync errors

### Error Responses
```json
{
  "error": "Descriptive error message"
}
```

## Testing

Comprehensive test suite included in `tests/team-sync-test.js`:

### Test Coverage
- Team creation and owner auto-membership
- Member addition and role assignment
- Team game creation with auto-sync
- Membership change synchronization
- Profile update synchronization
- Error handling and edge cases

### Running Tests
```bash
node tests/team-sync-test.js
```

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Efficient JSONB operations for player data
- Optimized trigger functions

### Scalability
- Pagination support for large team lists
- Efficient member lookup queries
- Minimal database calls in sync operations

## Future Enhancements

### Potential Features
- Team invitations system
- Team statistics and analytics
- Team-based leaderboards
- Bulk member operations
- Team templates
- Advanced role permissions

### Migration Path
- Existing games remain unaffected
- Teams are opt-in feature
- Backward compatibility maintained

## Troubleshooting

### Common Issues

#### Sync Not Working
1. Check database triggers are enabled
2. Verify RLS policies allow access
3. Ensure user profiles exist for all members

#### Permission Errors
1. Verify user is team member
2. Check role permissions
3. Confirm team is active

#### Performance Issues
1. Check database indexes
2. Monitor trigger execution time
3. Consider batch operations for large teams

### Debug Queries

```sql
-- Check team membership
SELECT * FROM get_team_members('team-uuid');

-- Verify game players sync
SELECT players FROM games WHERE id = 'game-uuid';

-- Check trigger status
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%team%';
```

## Conclusion

The team synchronization system provides a robust, scalable solution for managing teams and automatically keeping game player data synchronized. The implementation handles edge cases gracefully, maintains data consistency, and provides a solid foundation for team-based features in the domino scoring application.