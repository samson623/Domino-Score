import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
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
    const teamId = req.query.id;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    // Verify team exists and user has access
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is team owner for update/delete operations
    if ((req.method === 'PUT' || req.method === 'DELETE') && team.owner_id !== userId) {
      return res.status(403).json({ error: 'Only team owners can modify teams' });
    }

    if (req.method === 'GET') {
      // Get team details with members
      const { data: teamDetails, error: detailsError } = await supabase
        .rpc('get_user_teams', { user_uuid: userId })
        .eq('team_id', teamId)
        .single();

      if (detailsError) {
        console.error('Error fetching team details:', detailsError);
        return res.status(500).json({ error: 'Failed to fetch team details' });
      }

      // Get team members
      const { data: members, error: membersError } = await supabase
        .rpc('get_team_members', { team_uuid: teamId });

      if (membersError) {
        console.error('Error fetching team members:', membersError);
        return res.status(500).json({ error: 'Failed to fetch team members' });
      }

      return res.status(200).json({ 
        team: teamDetails,
        members 
      });
    }

    if (req.method === 'PUT') {
      // Update team
      const { name, description, avatar_url, max_members, is_active }: TeamUpdateRequest = req.body;

      const updateData: any = {};

      if (name !== undefined) {
        if (!name || name.trim().length === 0) {
          return res.status(400).json({ error: 'Team name cannot be empty' });
        }
        if (name.length > 100) {
          return res.status(400).json({ error: 'Team name must be 100 characters or less' });
        }
        updateData.name = name.trim();
      }

      if (description !== undefined) {
        if (description && description.length > 500) {
          return res.status(400).json({ error: 'Description must be 500 characters or less' });
        }
        updateData.description = description?.trim() || null;
      }

      if (avatar_url !== undefined) {
        updateData.avatar_url = avatar_url || null;
      }

      if (max_members !== undefined) {
        if (max_members < 2 || max_members > 50) {
          return res.status(400).json({ error: 'Max members must be between 2 and 50' });
        }
        
        // Check if reducing max_members would exceed current member count
        const { data: currentMembers, error: countError } = await supabase
          .from('team_memberships')
          .select('id')
          .eq('team_id', teamId)
          .eq('is_active', true);

        if (countError) {
          console.error('Error checking member count:', countError);
          return res.status(500).json({ error: 'Failed to validate member count' });
        }

        if (currentMembers.length > max_members) {
          return res.status(400).json({ 
            error: `Cannot reduce max members to ${max_members}. Current member count is ${currentMembers.length}` 
          });
        }

        updateData.max_members = max_members;
      }

      if (is_active !== undefined) {
        updateData.is_active = is_active;
      }

      updateData.updated_at = new Date().toISOString();

      const { data: updatedTeam, error: updateError } = await supabase
        .from('teams')
        .update(updateData)
        .eq('id', teamId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating team:', updateError);
        return res.status(500).json({ error: 'Failed to update team' });
      }

      // Get updated team details
      const { data: teamDetails, error: detailsError } = await supabase
        .rpc('get_user_teams', { user_uuid: userId })
        .eq('team_id', teamId)
        .single();

      if (detailsError) {
        console.error('Error fetching updated team:', detailsError);
        return res.status(500).json({ error: 'Team updated but failed to fetch details' });
      }

      return res.status(200).json({ team: teamDetails });
    }

    if (req.method === 'DELETE') {
      // Delete team (soft delete by setting is_active to false)
      const { error: deleteError } = await supabase
        .from('teams')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', teamId);

      if (deleteError) {
        console.error('Error deleting team:', deleteError);
        return res.status(500).json({ error: 'Failed to delete team' });
      }

      // Also deactivate all memberships
      const { error: membershipError } = await supabase
        .from('team_memberships')
        .update({ is_active: false })
        .eq('team_id', teamId);

      if (membershipError) {
        console.error('Error deactivating memberships:', membershipError);
        // Continue anyway, team is already deleted
      }

      return res.status(200).json({ message: 'Team deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Team API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}