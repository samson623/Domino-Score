import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  
  const { action } = req.body || {};
  
  try {
    if (action === 'checkout') {
      // Handle checkout session creation
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
    } 
    else if (action === 'portal') {
      // Handle billing portal session creation
      const { customerId } = req.body || {};
      if (!customerId) return res.status(400).json({ error: 'Missing customerId' });

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://domino-score.vercel.app'}/billing`,
      });
      return res.status(200).json({ url: session.url });
    }
    else {
      return res.status(400).json({ error: 'Invalid action. Use "checkout" or "portal"' });
    }
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
}