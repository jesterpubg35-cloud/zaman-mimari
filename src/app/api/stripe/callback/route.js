import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // user_id burada
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`/?error=stripe_connect_failed&message=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect('/?error=missing_params');
    }

    // OAuth token al
    const response = await getStripe().oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });

    const { stripe_user_id, access_token, refresh_token } = response;

    // Kullanıcının profiline Stripe hesap bilgilerini kaydet
    await getSupabase()
      .from('profilkisi')
      .update({
        stripe_account_id: stripe_user_id,
        stripe_access_token: access_token,
        stripe_refresh_token: refresh_token,
        is_provider: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', state);

    // Başarılı, uygulamaya yönlendir
    return NextResponse.redirect('/?success=stripe_connected');

  } catch (error) {
    console.error('Stripe Connect callback error:', error);
    return NextResponse.redirect(`/?error=stripe_callback_failed&message=${encodeURIComponent(error.message)}`);
  }
}
