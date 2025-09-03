import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY' });
  }
  return res.status(200).json({ supabaseUrl, supabaseAnonKey });
}
