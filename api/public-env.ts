import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSiteUrl } from './_utils/site-url';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res
      .status(500)
      .json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY' });
  }

  const siteUrl = getSiteUrl(req);

  return res.status(200).json({ supabaseUrl, supabaseAnonKey, siteUrl });
}
