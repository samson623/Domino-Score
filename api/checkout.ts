import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  try {
    const { priceId, customerEmail, successUrl, cancelUrl, clientReferenceId } = req.body || {};
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: customerEmail,
      line_items: [{ price: priceId ?? process.env.NEXT_PUBLIC_PRICE_PRO!, quantity: 1 }],
      success_url: successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://domino-score.vercel.app'}/billing/success`,
      cancel_url: cancelUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://domino-score.vercel.app'}/billing`,
      client_reference_id: clientReferenceId ?? undefined,
    });
    return res.status(200).json({ url: session.url });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
}
