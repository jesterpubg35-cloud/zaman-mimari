import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Sabit admin şifresi — değiştirmek için bu satırı güncelle
const ADMIN_PASSWORD = 'Uguryigit35x.';
const ADMIN_HASH = createHash('sha256').update(ADMIN_PASSWORD + 'tick_admin_salt_2025').digest('hex');

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function getIp(req) {
  return req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
}

// GET — her zaman şifre kurulu döner (setup modu yok)
export async function GET() {
  return NextResponse.json({ hasPassword: true });
}

// POST — sadece login
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { password } = body;
    const ip = getIp(req);
    const ua = req.headers.get('user-agent') || '';
    const hash = createHash('sha256').update((password || '') + 'tick_admin_salt_2025').digest('hex');
    const sb = getAdminClient();

    if (hash !== ADMIN_HASH) {
      await Promise.allSettled([
        sb.from('admin_logs').insert({ event_type: 'login_fail', ip_address: ip, user_agent: ua, detail: 'Hatalı şifre denemesi' }),
        sb.from('admin_login_attempts').insert({ email: 'admin', success: false, ip_address: ip, user_agent: ua }),
      ]);
      return NextResponse.json({ error: 'Hatalı şifre.' }, { status: 401 });
    }

    await Promise.allSettled([
      sb.from('admin_logs').insert({ event_type: 'login_success', ip_address: ip, user_agent: ua, detail: 'Admin paneli girişi başarılı.' }),
      sb.from('admin_login_attempts').insert({ email: 'admin', success: true, ip_address: ip, user_agent: ua }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Sunucu hatası: ' + e.message }, { status: 500 });
  }
}
