import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, limiter } from '../../_lib/auth';

const PLATFORM_COMMISSION = 0.20; // %20

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

// POST /api/stripe/escrow
// action: 'hold' | 'release' | 'refund'
export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (limiter(ip, 10, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { user, error: authError } = await verifyAuth(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, requestId, amount, paymentMethodId } = body;

    if (!action || !requestId) {
      return NextResponse.json({ error: 'action and requestId required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const stripe = getStripe();

    // --- HOLD: Müşteri işi başlattığında ödemeyi dondur ---
    if (action === 'hold') {
      if (!amount || !paymentMethodId) {
        return NextResponse.json({ error: 'amount and paymentMethodId required' }, { status: 400 });
      }

      // İş talebini doğrula - sender müşteri mi?
      const { data: jobReq } = await supabase
        .from('requests')
        .select('id, sender_id, receiver_id, status')
        .eq('id', requestId)
        .single();

      if (!jobReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      if (jobReq.sender_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (jobReq.status !== 'accepted') return NextResponse.json({ error: 'Job not accepted yet' }, { status: 400 });

      // Hizmet verenin Stripe account ID'sini al
      const { data: provider } = await supabase
        .from('profilkisi')
        .select('stripe_account_id')
        .eq('user_id', jobReq.receiver_id)
        .single();

      if (!provider?.stripe_account_id) {
        return NextResponse.json({ error: 'Provider has no Stripe account' }, { status: 400 });
      }

      const amountCents = Math.round(amount * 100);
      const commissionCents = Math.round(amountCents * PLATFORM_COMMISSION);
      const transferCents = amountCents - commissionCents;

      // capture_method: manual → para hold'da bekler, henüz çekilmez
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'try',
        payment_method: paymentMethodId,
        capture_method: 'manual',
        confirm: true,
        application_fee_amount: commissionCents,
        transfer_data: { destination: provider.stripe_account_id },
        metadata: {
          requestId,
          senderId: jobReq.sender_id,
          receiverId: jobReq.receiver_id,
          transferAmount: transferCents,
          commissionAmount: commissionCents,
        },
      });

      // DB'ye kaydet
      await supabase.from('escrow_holds').insert({
        request_id: requestId,
        payer_id: user.id,
        receiver_id: jobReq.receiver_id,
        payment_intent_id: paymentIntent.id,
        amount: amount,
        commission: Math.round(amount * PLATFORM_COMMISSION * 100) / 100,
        net_amount: Math.round(amount * (1 - PLATFORM_COMMISSION) * 100) / 100,
        status: 'held',
      });

      // Request status güncelle
      await supabase.from('requests').update({ status: 'in_progress', payment_status: 'held' }).eq('id', requestId);

      return NextResponse.json({ success: true, paymentIntentId: paymentIntent.id });
    }

    // --- RELEASE: Alıcı onayladığında parayı serbest bırak ---
    if (action === 'release') {
      // Sadece müşteri (sender) onaylayabilir
      const { data: hold } = await supabase
        .from('escrow_holds')
        .select('*')
        .eq('request_id', requestId)
        .eq('status', 'held')
        .single();

      if (!hold) return NextResponse.json({ error: 'No active hold found' }, { status: 404 });
      if (hold.payer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      // capture → para hizmet verene aktarılır (%20 platform'da kalır)
      await stripe.paymentIntents.capture(hold.payment_intent_id);

      await supabase.from('escrow_holds').update({ status: 'released', released_at: new Date().toISOString() }).eq('id', hold.id);
      await supabase.from('requests').update({ status: 'completed', payment_status: 'released' }).eq('id', requestId);

      // Provider kazanç kaydı
      await supabase.from('transactions').insert({
        user_id: hold.receiver_id,
        type: 'earning',
        amount: hold.net_amount,
        commission: hold.commission,
        total_amount: hold.amount,
        status: 'completed',
        payment_intent_id: hold.payment_intent_id,
        request_id: requestId,
        description: 'İş tamamlandı - kazanç',
      });

      return NextResponse.json({ success: true });
    }

    // --- REFUND: Anlaşmazlık / iptal ---
    if (action === 'refund') {
      const { data: hold } = await supabase
        .from('escrow_holds')
        .select('*')
        .eq('request_id', requestId)
        .eq('status', 'held')
        .single();

      if (!hold) return NextResponse.json({ error: 'No active hold found' }, { status: 404 });

      // Sadece müşteri veya admin iptal edebilir
      const { data: requester } = await supabase.from('profilkisi').select('is_admin').eq('user_id', user.id).single();
      const isAdmin = requester?.is_admin;
      if (hold.payer_id !== user.id && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Hold iptal - para iade
      await stripe.paymentIntents.cancel(hold.payment_intent_id);

      await supabase.from('escrow_holds').update({ status: 'refunded', released_at: new Date().toISOString() }).eq('id', hold.id);
      await supabase.from('requests').update({ status: 'disputed', payment_status: 'refunded' }).eq('id', requestId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Escrow error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
