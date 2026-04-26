import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy Supabase client
let supabase;
const getSupabase = () => {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase configuration missing');
    }
    supabase = createClient(url, key);
  }
  return supabase;
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { fromUserId, toUserId, phone, amount, description, commission = 0 } = body;

    if (!fromUserId || (!toUserId && !phone) || !amount) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    // Alıcıyı bul (telefon veya userId ile)
    let receiverId = toUserId;
    if (!receiverId && phone) {
      const { data: profile } = await getSupabase()
        .from('profilkisi')
        .select('user_id')
        .eq('phone', phone)
        .single();
      if (!profile) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      receiverId = profile.user_id;
    }

    if (receiverId === fromUserId) {
      return NextResponse.json({ error: 'Cannot transfer to yourself' }, { status: 400 });
    }

    // Gönderenin bakiyesini kontrol et
    const { data: senderBalance } = await getSupabase()
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', fromUserId)
      .single();

    if (!senderBalance || senderBalance.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const receiverAmount = amount - commission;

    // Bakiyeleri güncelle
    await getSupabase()
      .from('wallet_balances')
      .update({ balance: senderBalance.balance - amount, updated_at: new Date().toISOString() })
      .eq('user_id', fromUserId);

    await getSupabase()
      .from('wallet_balances')
      .upsert({
        user_id: receiverId,
        balance: receiverAmount,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    // Gönderen için işlem kaydı (withdrawal)
    await getSupabase().from('transactions').insert({
      user_id: fromUserId,
      type: 'withdrawal',
      amount: amount,
      commission: commission,
      total_amount: amount,
      status: 'completed',
      description: `Transfer: ${description || 'Para gönderimi'} (Komisyon: ${commission}₺)`,
      to_user_id: receiverId
    });

    // Alıcı için işlem kaydı (deposit)
    await getSupabase().from('transactions').insert({
      user_id: receiverId,
      type: 'deposit',
      amount: receiverAmount,
      commission: 0,
      total_amount: receiverAmount,
      status: 'completed',
      description: `Transfer alındı: ${description || 'Para geldi'}`,
      from_user_id: fromUserId
    });

    return NextResponse.json({ success: true, commission, receiverAmount });
  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
