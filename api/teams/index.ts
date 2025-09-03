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

    if (req.method === 'POST') {
      // Create a new team
      const { name, players } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Team name is required' });
      }

      // Create the team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: name,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) {
        return res.status(500).json({ error: teamError.message });
      }

      // Add the creator as an admin
      const { error: creatorError } = await supabase
        .from('team_players')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'admin',
        });

      if (creatorError) {
        // If adding the creator fails, we should probably delete the team
        // to avoid an orphaned team. For now, just log the error.
        console.error('Failed to add creator to team:', creatorError);
        return res.status(500).json({ error: 'Failed to add creator to the team' });
      }

      // Add other players to the team
      if (players && Array.isArray(players)) {
        const playerRecords = players.map(playerId => ({
          team_id: team.id,
          user_id: playerId,
          role: 'member',
        }));

        const { error: playersError } = await supabase
          .from('team_players')
          .insert(playerRecords);

        if (playersError) {
          return res.status(500).json({ error: playersError.message });
        }
      }

      return res.status(201).json({ team });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
