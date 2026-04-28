import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function hashPassword(pw) {
  return createHash('sha256').update(pw + 'tick_admin_salt_2025').digest('hex');
}

function getIp(req) {
  return req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
}

// GET — şifre kurulu mu?
export async function GET() {
  try {
    const sb = getAdminClient();
    const { data } = await sb
      .from('admin_settings')
      .select('value')
      .eq('key', 'admin_password_hash')
      .maybeSingle();
    return NextResponse.json({ hasPassword: !!data });
  } catch {
    return NextResponse.json({ hasPassword: false });
  }
}

// POST — şifre kur veya giriş yap
export async function POST(req) {
  try {
    const sb = getAdminClient();
    const body = await req.json().catch(() => ({}));
    const { action, password, confirmPassword } = body;
    const ip = getIp(req);
    const ua = req.headers.get('user-agent') || '';

    // ── Şifre kur ──────────────────────────────────────────────
    if (action === 'setup') {
      if (!password || password.length < 8) {
        return NextResponse.json({ error: 'Şifre en az 8 karakter olmalı.' }, { status: 400 });
      }
      if (password !== confirmPassword) {
        return NextResponse.json({ error: 'Şifreler eşleşmiyor.' }, { status: 400 });
      }

      // Zaten şifre var mı?
      const { data: existing } = await sb
        .from('admin_settings')
        .select('key')
        .eq('key', 'admin_password_hash')
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Şifre zaten belirlenmiş.' }, { status: 403 });
      }

      const hash = hashPassword(password);
      await sb.from('admin_settings').upsert({ key: 'admin_password_hash', value: hash, updated_at: new Date().toISOString() });
      await sb.from('admin_logs').insert({ event_type: 'password_set', ip_address: ip, user_agent: ua, detail: 'İlk admin şifresi belirlendi.' });

      return NextResponse.json({ success: true });
    }

    // ── Giriş ──────────────────────────────────────────────────
    if (action === 'login') {
      const { data: setting } = await sb
        .from('admin_settings')
        .select('value')
        .eq('key', 'admin_password_hash')
        .maybeSingle();

      if (!setting) {
        return NextResponse.json({ error: 'Şifre henüz belirlenmemiş.', needsSetup: true }, { status: 401 });
      }

      const hash = hashPassword(password);
      if (hash !== setting.value) {
        // Hatalı deneme logla
        await sb.from('admin_logs').insert({
          event_type: 'login_fail',
          ip_address: ip,
          user_agent: ua,
          detail: `Hatalı şifre denemesi`,
        });
        // Eski tabloyu da güncelle (geriye dönük uyumluluk)
        await sb.from('admin_login_attempts').insert({
          email: 'admin',
          success: false,
          ip_address: ip,
          user_agent: ua,
        }).catch(() => {});

        // Kaç hatalı deneme var?
        const { count } = await sb
          .from('admin_logs')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'login_fail')
          .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

        return NextResponse.json({ error: 'Hatalı şifre.', failCount: count || 1 }, { status: 401 });
      }

      // Başarılı giriş
      await sb.from('admin_logs').insert({
        event_type: 'login_success',
        ip_address: ip,
        user_agent: ua,
        detail: 'Admin paneli girişi başarılı.',
      });
      await sb.from('admin_login_attempts').insert({
        email: 'admin',
        success: true,
        ip_address: ip,
        user_agent: ua,
      }).catch(() => {});

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Sunucu hatası: ' + e.message }, { status: 500 });
  }
}
