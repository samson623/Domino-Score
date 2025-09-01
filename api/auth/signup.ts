import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, username, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create the user account
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
      message: 'Please check your email to confirm your account',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
