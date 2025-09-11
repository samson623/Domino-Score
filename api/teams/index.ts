import supabase from '../_supabase';
import jwt from 'jsonwebtoken';

interface TeamCreateRequest {
  name: string;
  description?: string;
  avatar_url?: string;
  max_members?: number;
}

interface TeamUpdateRequest {
  name?: string;
  description?: string;
  avatar_url?: string;
  max_members?: number;
  is_active?: boolean;
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    if (req.method === 'GET') {
      // Get user's teams
      const { data: teams, error } = await supabase
        .rpc('get_user_teams', { user_uuid: userId });

      if (error) {
        console.error('Error fetching teams:', error);
        return res.status(500).json({ error: 'Failed to fetch teams' });
      }

      return res.status(200).json({ teams });
    }

    if (req.method === 'POST') {
      // Create new team
      const { name, description, avatar_url, max_members = 10 }: TeamCreateRequest = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Team name is required' });
      }

      if (name.length > 100) {
        return res.status(400).json({ error: 'Team name must be 100 characters or less' });
      }

      if (description && description.length > 500) {
        return res.status(400).json({ error: 'Description must be 500 characters or less' });
      }

      if (max_members && (max_members < 2 || max_members > 50)) {
        return res.status(400).json({ error: 'Max members must be between 2 and 50' });
      }

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          owner_id: userId,
          avatar_url: avatar_url || null,
          max_members
        })
        .select()
        .single();

      if (teamError) {
        console.error('Error creating team:', teamError);
        return res.status(500).json({ error: 'Failed to create team' });
      }

      // Get the created team with member count
      const { data: createdTeam, error: fetchError } = await supabase
        .rpc('get_user_teams', { user_uuid: userId })
        .eq('team_id', team.id)
        .single();

      if (fetchError) {
        console.error('Error fetching created team:', fetchError);
        return res.status(500).json({ error: 'Team created but failed to fetch details' });
      }

      return res.status(201).json({ team: createdTeam });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Teams API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}