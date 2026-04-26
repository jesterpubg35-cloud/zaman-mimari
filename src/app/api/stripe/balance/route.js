import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, limiter } from '../../_lib/auth';

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2023-10-16' });
};

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
};

// GET /api/stripe/balance
export async function GET(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (limiter(ip, 20, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { user, error: authError } = await verifyAuth(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Kullanıcının stripe_account_id'sini al
    const { data: profile } = await supabase
      .from('profilkisi')
      .select('stripe_account_id, is_provider')
      .eq('user_id', user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ available: 0, pending: 0, total: 0, connected: false });
    }

    const stripe = getStripe();

    // Stripe Connect account bakiyesini çek
    const balance = await stripe.balance.retrieve({ stripeAccount: profile.stripe_account_id });

    const available = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
    const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;

    // DB'den toplam kazancı hesapla
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'earning')
      .eq('status', 'completed');

    const total = (transactions || []).reduce((sum, t) => sum + (t.amount || 0), 0);

    // Bekleyen hold'ları da hesapla
    const { data: holds } = await supabase
      .from('escrow_holds')
      .select('net_amount')
      .eq('receiver_id', user.id)
      .eq('status', 'held');

    const pendingFromHolds = (holds || []).reduce((sum, h) => sum + (h.net_amount || 0), 0);

    return NextResponse.json({
      connected: true,
      available: Math.round(available * 100) / 100,
      pending: Math.round((pending + pendingFromHolds) * 100) / 100,
      total: Math.round(total * 100) / 100,
    });

  } catch (error) {
    console.error('Balance error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
