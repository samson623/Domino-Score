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
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;

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

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Players Table
CREATE TABLE IF NOT EXISTS team_players (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- e.g., 'admin', 'member'
  PRIMARY KEY (team_id, user_id)
);

-- RLS Policies for leaderboard
CREATE POLICY "Users can view all leaderboard entries" ON leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own leaderboard entries" ON leaderboard
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leaderboard entries" ON leaderboard
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for teams
CREATE POLICY "Authenticated users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Team members can view their team" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can update their team" ON teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM team_players WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for team_players
CREATE POLICY "Team members can view team players" ON team_players
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can manage team players" ON team_players
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_players WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

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
