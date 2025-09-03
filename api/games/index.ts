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
      const { gameType, players, initialData, teamId } = req.body;

      if (!gameType) {
        return res.status(400).json({ error: 'Game type is required' });
      }

      let gameData: any = {
        user_id: user.id,
        game_type: gameType,
        players: players || [],
        scores: initialData || {},
        completed: false,
      };

      // If teamId is provided, validate team membership and sync players
      if (teamId) {
        // Verify user is a member of the team
        const { data: membership, error: membershipError } = await supabase
          .from('team_memberships')
          .select('role')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (membershipError || !membership) {
          return res.status(403).json({ error: 'You are not a member of this team' });
        }

        // Get team members and sync as players
        const { data: teamMembers, error: membersError } = await supabase
          .rpc('get_team_members', { team_uuid: teamId });

        if (membersError) {
          return res.status(500).json({ error: 'Failed to fetch team members' });
        }

        // Convert team members to players format
        const teamPlayers = teamMembers
          .filter((member: any) => member.is_active)
          .map((member: any) => ({
            id: member.user_id,
            username: member.username,
            full_name: member.full_name,
            avatar_url: member.avatar_url,
            role: member.role
          }));

        gameData.players = teamPlayers;
      }

      const { data: game, error } = await supabase
        .from('games')
        .insert(gameData)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // If this is a team game, create the team_games association
      if (teamId) {
        const { error: teamGameError } = await supabase
          .from('team_games')
          .insert({
            team_id: teamId,
            game_id: game.id
          });

        if (teamGameError) {
          console.error('Error creating team game association:', teamGameError);
          // Continue anyway, game is already created
        }
      }

      return res.status(201).json({ game });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
