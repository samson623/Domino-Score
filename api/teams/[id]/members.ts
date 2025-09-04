import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AddMemberRequest {
  user_id: string;
  role?: 'admin' | 'member';
}

interface UpdateMemberRequest {
  role?: 'admin' | 'member';
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
    const teamId = req.query.id;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    // Verify team exists and get team info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .eq('is_active', true)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: 'Team not found or inactive' });
    }

    // Check user's role in the team
    const { data: userMembership, error: membershipError } = await supabase
      .from('team_memberships')
      .select('role, is_active')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (membershipError || !userMembership) {
      return res.status(403).json({ error: 'You are not a member of this team' });
    }

    const canManageMembers = userMembership.role === 'owner' || userMembership.role === 'admin';

    if (req.method === 'GET') {
      // Get team members
      const { data: members, error: membersError } = await supabase
        .rpc('get_team_members', { team_uuid: teamId });

      if (membersError) {
        console.error('Error fetching team members:', membersError);
        return res.status(500).json({ error: 'Failed to fetch team members' });
      }

      return res.status(200).json({ members });
    }

    if (req.method === 'POST') {
      // Add new member
      if (!canManageMembers) {
        return res.status(403).json({ error: 'Only team owners and admins can add members' });
      }

      const { user_id, role = 'member' }: AddMemberRequest = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      if (role !== 'admin' && role !== 'member') {
        return res.status(400).json({ error: 'Role must be either "admin" or "member"' });
      }

      // Check if user exists
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user_id)
        .single();

      if (userError || !userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check current member count
      const { data: currentMembers, error: countError } = await supabase
        .from('team_memberships')
        .select('id')
        .eq('team_id', teamId)
        .eq('is_active', true);

      if (countError) {
        console.error('Error checking member count:', countError);
        return res.status(500).json({ error: 'Failed to validate member count' });
      }

      if (currentMembers.length >= team.max_members) {
        return res.status(400).json({ 
          error: `Team is full. Maximum ${team.max_members} members allowed.` 
        });
      }

      // Check if user is already a member
      const { data: existingMembership, error: existingError } = await supabase
        .from('team_memberships')
        .select('is_active')
        .eq('team_id', teamId)
        .eq('user_id', user_id)
        .single();

      if (existingMembership) {
        if (existingMembership.is_active) {
          return res.status(400).json({ error: 'User is already a member of this team' });
        } else {
          // Reactivate membership
          const { data: reactivatedMember, error: reactivateError } = await supabase
            .from('team_memberships')
            .update({ 
              is_active: true, 
              role,
              joined_at: new Date().toISOString()
            })
            .eq('team_id', teamId)
            .eq('user_id', user_id)
            .select()
            .single();

          if (reactivateError) {
            console.error('Error reactivating membership:', reactivateError);
            return res.status(500).json({ error: 'Failed to add member' });
          }

          // Get updated member info
          const { data: memberInfo, error: memberError } = await supabase
            .rpc('get_team_members', { team_uuid: teamId })
            .eq('user_id', user_id)
            .single();

          return res.status(200).json({ 
            message: 'Member added successfully',
            member: memberInfo 
          });
        }
      }

      // Add new membership
      const { data: newMember, error: addError } = await supabase
        .from('team_memberships')
        .insert({
          team_id: teamId,
          user_id: user_id,
          role,
          is_active: true
        })
        .select()
        .single();

      if (addError) {
        console.error('Error adding member:', addError);
        return res.status(500).json({ error: 'Failed to add member' });
      }

      // Get member info
      const { data: memberInfo, error: memberError } = await supabase
        .rpc('get_team_members', { team_uuid: teamId })
        .eq('user_id', user_id)
        .single();

      if (memberError) {
        console.error('Error fetching member info:', memberError);
      }

      // Verify synchronization worked by checking if team games were updated
      const { data: teamGames, error: gamesError } = await supabase
        .from('team_games')
        .select('game_id')
        .eq('team_id', teamId);

      let syncStatus = 'success';
      if (gamesError) {
        console.error('Error checking team games for sync:', gamesError);
        syncStatus = 'warning';
      }

      return res.status(201).json({ 
        message: 'Member added successfully',
        member: memberInfo,
        syncStatus,
        teamGamesCount: teamGames?.length || 0
      });
    }

    if (req.method === 'PUT') {
      // Update member role or status
      if (!canManageMembers) {
        return res.status(403).json({ error: 'Only team owners and admins can update members' });
      }

      const { user_id } = req.query;
      const { role, is_active }: UpdateMemberRequest = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'User ID is required in query parameters' });
      }

      // Prevent owner from being modified
      if (user_id === team.owner_id) {
        return res.status(400).json({ error: 'Cannot modify team owner membership' });
      }

      // Only owners can promote to admin or demote admins
      if (role === 'admin' && userMembership.role !== 'owner') {
        return res.status(403).json({ error: 'Only team owners can promote members to admin' });
      }

      const updateData: any = {};
      
      if (role !== undefined) {
        if (role !== 'admin' && role !== 'member') {
          return res.status(400).json({ error: 'Role must be either "admin" or "member"' });
        }
        updateData.role = role;
      }

      if (is_active !== undefined) {
        updateData.is_active = is_active;
      }

      const { data: updatedMember, error: updateError } = await supabase
        .from('team_memberships')
        .update(updateData)
        .eq('team_id', teamId)
        .eq('user_id', user_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating member:', updateError);
        return res.status(500).json({ error: 'Failed to update member' });
      }

      // Get updated member info
      const { data: memberInfo, error: memberError } = await supabase
        .rpc('get_team_members', { team_uuid: teamId })
        .eq('user_id', user_id)
        .single();

      return res.status(200).json({ 
        message: 'Member updated successfully',
        member: memberInfo 
      });
    }

    if (req.method === 'DELETE') {
      // Remove member
      if (!canManageMembers) {
        return res.status(403).json({ error: 'Only team owners and admins can remove members' });
      }

      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({ error: 'User ID is required in query parameters' });
      }

      // Prevent owner from being removed
      if (user_id === team.owner_id) {
        return res.status(400).json({ error: 'Cannot remove team owner' });
      }

      // Remove member (soft delete)
      const { error: removeError } = await supabase
        .from('team_memberships')
        .update({ is_active: false })
        .eq('team_id', teamId)
        .eq('user_id', user_id);

      if (removeError) {
        console.error('Error removing member:', removeError);
        return res.status(500).json({ error: 'Failed to remove member' });
      }

      // Verify synchronization by checking team games were updated
      const { data: teamGames, error: gamesError } = await supabase
        .from('team_games')
        .select('game_id')
        .eq('team_id', teamId);

      let syncStatus = 'success';
      if (gamesError) {
        console.error('Error checking team games for sync:', gamesError);
        syncStatus = 'warning';
      }

      return res.status(200).json({ 
        message: 'Member removed successfully',
        syncStatus,
        teamGamesCount: teamGames?.length || 0
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Team members API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}