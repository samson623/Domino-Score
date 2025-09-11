import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { buffer } from 'micro';
import supabase from './_supabase';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const sig = req.headers['stripe-signature'] as string;
  // Read raw body for Stripe webhook verification
  const buf = await buffer(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.customer && s.client_reference_id) {
          const customerId = typeof s.customer === 'string' ? s.customer : s.customer.id;
          await supabase.from('user_billing').upsert(
            { user_id: s.client_reference_id, stripe_customer_id: customerId },
            { onConflict: 'user_id' }
          );
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status = sub.status;
        const currentEnd = new Date((sub.current_period_end || 0) * 1000).toISOString();

        const { data: ub } = await supabase
          .from('user_billing')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (ub?.user_id) {
          await supabase.from('user_billing').upsert(
            {
              user_id: ub.user_id,
              stripe_subscription_id: sub.id,
              plan_id: status === 'active' ? 'pro' : 'free',
              status,
              current_period_end: currentEnd,
            },
            { onConflict: 'user_id' }
          );
        }
        break;
      }
    }
    return res.status(200).json({ received: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
