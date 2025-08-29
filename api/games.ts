import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Malformed token' });
    }

    // Create a Supabase client with the user's token to authenticate
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return res.status(401).json({ error: userError?.message || 'Unauthorized' });
    }

    // For database operations, use the service role to bypass RLS, as we've already verified the user.
    const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);

    if (req.method === 'GET') {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_billing')
                .select('games_data')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching games data:', error);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }

            return res.status(200).json(data?.games_data || null);
        } catch (e: any) {
            return res.status(500).json({ error: e.message });
        }
    } else if (req.method === 'POST') {
        try {
            const gamesData = req.body;

            // Upsert the data into the user_billing table
            const { error } = await supabaseAdmin
                .from('user_billing')
                .upsert(
                    { user_id: user.id, games_data: gamesData },
                    { onConflict: 'user_id' }
                );

            if (error) {
                console.error('Error saving games data:', error);
                return res.status(500).json({ error: 'Failed to save data' });
            }

            return res.status(200).json({ success: true, message: 'Data saved successfully.' });
        } catch (e: any) {
            return res.status(500).json({ error: e.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end('Method Not Allowed');
    }
}
