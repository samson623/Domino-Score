import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  try {
    const { customerId } = req.body || {};
    if (!customerId) return res.status(400).json({ error: 'Missing customerId' });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL ?? 'https://domino-score.vercel.app'}/billing`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
}
