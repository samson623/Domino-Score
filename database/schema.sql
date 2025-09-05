-- Doma: dominoes score app
-- For more information, please visit https://doma.app
-- Author: Domas Balciunas
-- Date: 2025-08-30
-- Version: 1.0.0


-- Supabase Database Schema for Domino Score App

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games Table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL, -- 'dominoes', 'custom', etc.
  players JSONB, -- Array of player objects with names and IDs
  scores JSONB, -- Game scores data
  winner TEXT,
  duration INTERVAL, -- Game duration
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Sessions Table (for ongoing games)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_data JSONB, -- Current game state
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard Table
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  average_score DECIMAL(10,2) DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game_type)
);

-- User Billing Table (already exists from webhook)
-- This is handled by the existing stripe-webhook.ts

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for games
CREATE POLICY "Users can view their own games" ON games
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own games" ON games
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own games" ON games
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for game_sessions
CREATE POLICY "Users can view their own game sessions" ON game_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own game sessions" ON game_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for leaderboard
CREATE POLICY "Users can view all leaderboard entries" ON leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own leaderboard entries" ON leaderboard
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leaderboard entries" ON leaderboard
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions for leaderboard updates
CREATE OR REPLACE FUNCTION update_leaderboard_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update leaderboard when a game is completed
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    INSERT INTO leaderboard (user_id, game_type, total_games, total_wins, total_score, best_score)
    VALUES (
      NEW.user_id,
      NEW.game_type,
      1,
      CASE WHEN NEW.winner = (SELECT username FROM user_profiles WHERE user_id = NEW.user_id) THEN 1 ELSE 0 END,
      COALESCE((NEW.scores->>'total')::INTEGER, 0),
      COALESCE((NEW.scores->>'total')::INTEGER, 0)
    )
    ON CONFLICT (user_id, game_type)
    DO UPDATE SET
      total_games = leaderboard.total_games + 1,
      total_wins = leaderboard.total_wins + CASE WHEN NEW.winner = (SELECT username FROM user_profiles WHERE user_id = NEW.user_id) THEN 1 ELSE 0 END,
      total_score = leaderboard.total_score + COALESCE((NEW.scores->>'total')::INTEGER, 0),
      best_score = GREATEST(leaderboard.best_score, COALESCE((NEW.scores->>'total')::INTEGER, 0)),
      average_score = ((leaderboard.total_score + COALESCE((NEW.scores->>'total')::INTEGER, 0))::DECIMAL / (leaderboard.total_games + 1)),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update leaderboard
CREATE TRIGGER update_leaderboard_on_game_complete
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_stats();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_completed ON games(completed);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_game_type ON leaderboard(game_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
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

-- Team Memberships Table
CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(team_id, user_id)
);

-- Team Games Table (for team-based games)
CREATE TABLE IF NOT EXISTS team_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, game_id)
);

-- Enable Row Level Security for team tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_games ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view teams they are members of" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Team owners can update their teams" ON teams
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can delete their teams" ON teams
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for team_memberships
CREATE POLICY "Users can view memberships of their teams" ON team_memberships
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Team owners and admins can manage memberships" ON team_memberships
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

-- RLS Policies for team_games
CREATE POLICY "Users can view team games of their teams" ON team_games
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Team members can create team games" ON team_games
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Indexes for team tables
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_user_id ON team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_active ON team_memberships(is_active);
CREATE INDEX IF NOT EXISTS idx_team_games_team_id ON team_games(team_id);
CREATE INDEX IF NOT EXISTS idx_team_games_game_id ON team_games(game_id);

-- Function to automatically add team owner as member
CREATE OR REPLACE FUNCTION add_team_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_memberships (team_id, user_id, role, is_active)
  VALUES (NEW.id, NEW.owner_id, 'owner', true)
  ON CONFLICT (team_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add team owner as member when team is created
CREATE TRIGGER add_owner_to_team_membership
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_team_owner_as_member();

-- Function to synchronize team players with games
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

-- Trigger to sync team players when membership changes
CREATE TRIGGER sync_team_players_on_membership_change
  AFTER INSERT OR UPDATE OR DELETE ON team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION sync_team_players_to_games();

-- Function to sync team players when user profile is updated
CREATE OR REPLACE FUNCTION sync_team_players_on_profile_update()
RETURNS TRIGGER AS $$
DECLARE
  team_record RECORD;
  team_members JSONB;
  game_record RECORD;
BEGIN
  -- Find all teams this user is a member of
  FOR team_record IN 
    SELECT tm.team_id 
    FROM team_memberships tm
    WHERE tm.user_id = NEW.user_id AND tm.is_active = true
  LOOP
    -- Get updated team members for this team
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
    WHERE tm.team_id = team_record.team_id AND tm.is_active = true;

    -- Update all games associated with this team
    FOR game_record IN 
      SELECT g.id 
      FROM games g
      JOIN team_games tg ON g.id = tg.game_id
      WHERE tg.team_id = team_record.team_id
    LOOP
      UPDATE games 
      SET 
        players = team_members,
        updated_at = NOW()
      WHERE id = game_record.id;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync team players when user profile is updated
CREATE TRIGGER sync_team_players_on_profile_change
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_team_players_on_profile_update();

-- Function to get team members with their profiles
CREATE OR REPLACE FUNCTION get_team_members(team_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  joined_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.user_id,
    up.username,
    up.full_name,
    up.avatar_url,
    tm.role,
    tm.joined_at,
    tm.is_active
  FROM team_memberships tm
  JOIN user_profiles up ON tm.user_id = up.user_id
  WHERE tm.team_id = team_uuid
  ORDER BY 
    CASE tm.role 
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'member' THEN 3
    END,
    tm.joined_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user teams
CREATE OR REPLACE FUNCTION get_user_teams(user_uuid UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  description TEXT,
  owner_id UUID,
  avatar_url TEXT,
  is_active BOOLEAN,
  max_members INTEGER,
  member_count BIGINT,
  user_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    t.owner_id,
    t.avatar_url,
    t.is_active,
    t.max_members,
    (
      SELECT COUNT(*) 
      FROM team_memberships tm2 
      WHERE tm2.team_id = t.id AND tm2.is_active = true
    ) as member_count,
    tm.role,
    t.created_at
  FROM teams t
  JOIN team_memberships tm ON t.id = tm.team_id
  WHERE tm.user_id = user_uuid AND tm.is_active = true
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID, game_type_filter TEXT DEFAULT NULL)
RETURNS TABLE (
  total_games BIGINT,
  total_wins BIGINT,
  total_score BIGINT,
  average_score DECIMAL,
  best_score INTEGER,
  win_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.total_games,
    l.total_wins,
    l.total_score,
    l.average_score,
    l.best_score,
    CASE
      WHEN l.total_games > 0 THEN (l.total_wins::DECIMAL / l.total_games) * 100
      ELSE 0
    END as win_rate
  FROM leaderboard l
  WHERE l.user_id = user_uuid
    AND (game_type_filter IS NULL OR l.game_type = game_type_filter);
END;
$$ LANGUAGE plpgsql;

-- Function to create or get user profile for team members
