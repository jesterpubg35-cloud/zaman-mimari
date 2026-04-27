import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'uguryigitkarakuzu@gmail.com';

export async function POST(req) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!url || !anonKey || !serviceKey || !stripeKey) return NextResponse.json({ error: 'Server env missing' }, { status: 500 });

    const token = (req.headers.get('authorization') || '').replace(/^bearer /i, '').trim();
    const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: { user } } = await anonClient.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: profile } = await adminClient.from('profilkisi').select('is_admin').eq('user_id', user.id).maybeSingle();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { paymentIntentId, transactionId, reason } = await req.json();
    if (!paymentIntentId) return NextResponse.json({ error: 'paymentIntentId gerekli' }, { status: 400 });

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer',
    });

    if (transactionId) {
      await adminClient.from('transactions').update({ status: 'refunded', refund_id: refund.id }).eq('id', transactionId);
    }

    return NextResponse.json({ success: true, refund });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Refund failed' }, { status: 500 });
  }
}
