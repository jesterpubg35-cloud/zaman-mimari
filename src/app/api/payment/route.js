import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, limiter } from '../_lib/auth';

// Lazy Stripe initialization - env var yoksa null
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

// Lazy Supabase client
let supabaseClient;
const getSupabase = () => {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase configuration missing');
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
};

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

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    
    const body = await request.json();
    const { amount, userId, commission = 0, netAmount = amount } = body;

    if (!amount || !userId) {
      return NextResponse.json({ error: 'Amount and userId required' }, { status: 400 });
    }

    // Sadece kendi adına ödeme yapabilir
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Stripe Payment Intent oluştur
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // cents
      currency: 'try',
      automatic_payment_methods: { enabled: true },
      metadata: { userId: userId, originalAmount: amount, commission: commission }
    });

    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Ödeme başarılı olduktan sonra kayıt için endpoint
export async function PUT(request) {
  try {
    const { user, error: authError } = await verifyAuth(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, amount, commission, netAmount, paymentIntentId, status = 'completed' } = body;

    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!userId || !amount) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    // İşlemi kaydet
    const { data: transaction, error: txError } = await getSupabase()
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount: netAmount,
        commission: commission,
        total_amount: amount,
        status: status,
        payment_intent_id: paymentIntentId,
        description: `Para yatırma (Komisyon: ${commission}₺)`
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction save error:', txError);
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // Bakiyeyi güncelle
    const { error: balanceError } = await getSupabase()
      .from('wallet_balances')
      .upsert({
        user_id: userId,
        balance: netAmount,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (balanceError) {
      console.error('Balance update error:', balanceError);
    }

    return NextResponse.json({ 
      success: true, 
      transaction: transaction 
    });
  } catch (error) {
    console.error('Payment confirm error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
