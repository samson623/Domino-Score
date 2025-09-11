import type { VercelRequest, VercelResponse } from '@vercel/node';
import supabase from '../_supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, redirectTo } = req.body;

    if (action === 'signin') {
      // Initiate Google OAuth sign-in
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || 'https://domino-score.vercel.app';
      const finalRedirectTo = redirectTo || `${origin}/`;
      
      console.log('Google OAuth signin initiated:', {
        origin,
        redirectTo: finalRedirectTo,
        userAgent: req.headers['user-agent']
      });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: finalRedirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth signin error:', error);
        return res.status(400).json({ 
          error: error.message,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }

      return res.status(200).json({ url: data.url });
    }

    if (action === 'callback') {
      // Handle OAuth callback
      const { code, state } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Check if user profile exists, create if not
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (!existingProfile && data.user) {
        // Create user profile from Google data
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            username: data.user.user_metadata?.preferred_username || 
                     data.user.user_metadata?.name?.toLowerCase().replace(/\s+/g, '') || 
                     data.user.email?.split('@')[0],
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
            email: data.user.email,
            avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }

      return res.status(200).json({
        user: data.user,
        session: data.session,
        profile: existingProfile || null,
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return res.status(500).json({ error: error.message });
  }
}