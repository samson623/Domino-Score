import type { VercelRequest, VercelResponse } from '@vercel/node';
import supabase from './_supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameType, limit = 50, userId } = req.query;

    let query = supabase
      .from('leaderboard')
      .select(`
        *,
        user_profiles!inner(username, full_name, avatar_url)
      `)
      .order('total_score', { ascending: false })
      .limit(limit as number);

    if (gameType) {
      query = query.eq('game_type', gameType);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: leaderboard, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Get user stats if userId is provided
    let userStats = null;
    if (userId) {
      const { data: stats } = await supabase.rpc('get_user_stats', {
        user_uuid: userId,
        game_type_filter: gameType || null
      });
      userStats = stats?.[0] || null;
    }

    return res.status(200).json({
      leaderboard: leaderboard || [],
      userStats,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
