import { NextResponse } from 'next/server';
import { verifyAuth, limiter } from '../../_lib/auth';

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (limiter(ip, 5, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { user, error: authError } = await verifyAuth(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json({ error: 'Stripe Connect not configured' }, { status: 500 });
    }

    // OAuth URL oluştur
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://192.168.1.152:3000'}/api/stripe/callback`;
    
    const oauthUrl = `https://connect.stripe.com/oauth/authorize?` + 
      `response_type=code&` +
      `client_id=${clientId}&` +
      `scope=read_write&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${userId}`;

    return NextResponse.json({ url: oauthUrl });

  } catch (error) {
    console.error('Stripe Connect init error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
