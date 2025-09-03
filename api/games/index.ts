import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.substring(7);

  try {
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (req.method === 'GET') {
      // Get user's games
      const { type, limit = 20, offset = 0 } = req.query;

      let query = supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset as number, (offset as number) + (limit as number) - 1);

      if (type) {
        query = query.eq('game_type', type);
      }

      const { data: games, error } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ games: games || [] });

    } else if (req.method === 'POST') {
      // Create a new game
      const { gameType, teamId, initialData } = req.body;

      if (!gameType || !teamId) {
        return res.status(400).json({ error: 'Game type and team ID are required' });
      }

      // 1. Fetch players from the team
      const { data: teamPlayers, error: teamPlayersError } = await supabase
        .from('team_players')
        .select('user_id')
        .eq('team_id', teamId);

      if (teamPlayersError) {
        return res.status(500).json({ error: teamPlayersError.message });
      }

      if (!teamPlayers || teamPlayers.length === 0) {
        return res.status(400).json({ error: 'No players found in the team' });
      }

      const playerIds = teamPlayers.map(p => p.user_id);

      // 2. Fetch user profiles for the players
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', playerIds);

      if (profilesError) {
        return res.status(500).json({ error: profilesError.message });
      }

      // 3. Construct the players array for the game
      const players = profiles.map(p => ({
        id: p.user_id,
        name: p.username,
        avatar_url: p.avatar_url,
      }));

      // 4. Create the game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          user_id: user.id,
          game_type: gameType,
          players: players,
          scores: initialData || {},
          completed: false,
        })
        .select()
        .single();

      if (gameError) {
        return res.status(500).json({ error: gameError.message });
      }

      return res.status(201).json({ game });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
