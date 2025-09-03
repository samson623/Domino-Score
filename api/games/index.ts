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
  const { id } = req.query;

  try {
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Handle individual game operations when ID is provided
    if (id && typeof id === 'string') {
      if (req.method === 'GET') {
        // Get specific game
        const { data: game, error } = await supabase
          .from('games')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Game not found' });
          }
          return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ game });

      } else if (req.method === 'PUT') {
        // Update game
        const { scores, winner, completed, duration, players } = req.body;

        const updateData: any = {};
        if (scores !== undefined) updateData.scores = scores;
        if (winner !== undefined) updateData.winner = winner;
        if (completed !== undefined) updateData.completed = completed;
        if (duration !== undefined) updateData.duration = duration;
        if (players !== undefined) updateData.players = players;

        const { data: game, error } = await supabase
          .from('games')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Game not found' });
          }
          return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ game });

      } else if (req.method === 'DELETE') {
        // Delete game
        const { error } = await supabase
          .from('games')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ message: 'Game deleted successfully' });
      }
    }
    // Handle collection operations when no ID is provided
    else {
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
        const { gameType, players, initialData, teamId } = req.body;

        if (!gameType || !players || !Array.isArray(players) || players.length === 0) {
          return res.status(400).json({ error: 'Game type and players are required' });
        }

        const gameData = {
          user_id: user.id,
          game_type: gameType,
          players: players,
          scores: initialData?.scores || {},
          completed: false,
          created_at: new Date().toISOString(),
          team_id: teamId || null
        };

        const { data: game, error } = await supabase
          .from('games')
          .insert([gameData])
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        return res.status(201).json({ game });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Games API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}