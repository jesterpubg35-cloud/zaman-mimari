import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, success } = body;

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await adminClient.from('admin_login_attempts').insert({
      email: email || 'unknown',
      success: Boolean(success),
      ip_address:
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        null,
      user_agent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
