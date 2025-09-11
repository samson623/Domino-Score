import type { VercelRequest, VercelResponse } from '@vercel/node';
import supabase from '../_supabase';

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
      // Get user profile
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        profile: profile || {
          user_id: user.id,
          username: null,
          full_name: null,
          email: user.email,
          avatar_url: null,
          created_at: user.created_at,
          updated_at: user.created_at,
        }
      });

    } else if (req.method === 'PUT') {
      // Update user profile
      const { username, fullName, avatarUrl } = req.body;

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (username !== undefined) updateData.username = username;
      if (fullName !== undefined) updateData.full_name = fullName;
      if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          ...updateData,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ profile });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
