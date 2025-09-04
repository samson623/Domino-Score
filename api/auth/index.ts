import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Handle session retrieval
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token provided' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify the JWT token
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Get user profile data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get billing information
      const { data: billing } = await supabase
        .from('user_billing')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return res.status(200).json({
        user,
        profile: profile || null,
        billing: billing || null,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    // Handle logout
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Successfully logged out' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, email, password, username, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (action === 'signup') {
      // Handle signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || null,
            full_name: fullName || null,
          }
        }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Create user profile if user was created
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.from('user_profiles').insert({
          user_id: data.user.id,
          username: username || null,
          full_name: fullName || null,
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        user: data.user,
        session: data.session,
        message: data.user?.email_confirmed_at ? 'User created and logged in' : 'User created. Please check your email to confirm your account.'
      });
    } else {
      // Handle login (default action)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      // Get user profile data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      return res.status(200).json({
        user: data.user,
        session: data.session,
        profile: profile || null,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}