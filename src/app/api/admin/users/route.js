import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getClients = async (req) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return { error: 'Server env missing' };

  const token = (req.headers.get('authorization') || '').replace(/^bearer /i, '').trim();
  if (!token) return { error: 'Unauthorized' };

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
  if (userErr || !userData?.user) return { error: 'Unauthorized' };

  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: adminRow } = await adminClient.from('profilkisi').select('is_admin').eq('user_id', userData.user.id).maybeSingle();
  if (!adminRow?.is_admin) return { error: 'Forbidden' };

  return { adminClient, uid: userData.user.id };
};

export async function GET(req) {
  try {
    const { adminClient, error } = await getClients(req);
    if (error) return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (type === 'transactions') {
      const { data, error: err } = await adminClient
        .from('transactions')
        .select('*, profilkisi(name, email)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (err) return NextResponse.json({ error: err.message }, { status: 500 });
      return NextResponse.json({ transactions: data || [] });
    }

    const { data: users, error: usersErr } = await adminClient
      .from('profilkisi')
      .select('user_id, name, email, phone, is_admin, is_banned, created_at, rating, roles')
      .order('created_at', { ascending: false });

    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });
    return NextResponse.json({ users: users || [] });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { adminClient, error } = await getClients(req);
    if (error) return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 401 });

    const { action, targetUserId } = await req.json();
    if (!action || !targetUserId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    if (action === 'ban') {
      await adminClient.from('profilkisi').update({ is_banned: true }).eq('user_id', targetUserId);
      return NextResponse.json({ success: true, action: 'banned' });
    }

    if (action === 'unban') {
      await adminClient.from('profilkisi').update({ is_banned: false }).eq('user_id', targetUserId);
      return NextResponse.json({ success: true, action: 'unbanned' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
