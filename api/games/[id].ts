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

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Game ID is required' });
  }

  try {
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

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

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

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

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
