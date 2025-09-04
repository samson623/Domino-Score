import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.sub;
    const { teamId, gameId } = req.body;

    if (!teamId || !gameId) {
      return res.status(400).json({ error: 'teamId and gameId are required' });
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_memberships')
      .select('role, is_active')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'You are not a member of this team' });
    }

    // Verify the game exists and is associated with the team
    const { data: teamGame, error: teamGameError } = await supabase
      .from('team_games')
      .select('*')
      .eq('team_id', teamId)
      .eq('game_id', gameId)
      .single();

    if (teamGameError || !teamGame) {
      return res.status(404).json({ error: 'Game not found or not associated with team' });
    }

    // Get current team members
    const { data: teamMembers, error: teamMembersError } = await supabase
      .rpc('get_team_members', { team_uuid: teamId });

    if (teamMembersError) {
      return res.status(500).json({ error: 'Failed to fetch team members' });
    }

    // Convert team members to players format
    const updatedPlayers = teamMembers
      .filter((member: any) => member.is_active)
      .map((member: any) => ({
        id: member.user_id,
        username: member.username,
        full_name: member.full_name,
        avatar_url: member.avatar_url,
        role: member.role
      }));

    // Update the game with current team members
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        players: updatedPlayers,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update game players' });
    }

    return res.status(200).json({ 
      message: 'Game players synchronized successfully',
      game: updatedGame,
      playersCount: updatedPlayers.length
    });

  } catch (error) {
    console.error('Team sync API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}