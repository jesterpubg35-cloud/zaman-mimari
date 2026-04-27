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

    // ── transactions ──────────────────────────────────────────
    if (type === 'transactions') {
      const { data, error: err } = await adminClient
        .from('transactions')
        .select('*, profilkisi(name, email)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (err) return NextResponse.json({ error: err.message }, { status: 500 });
      return NextResponse.json({ transactions: data || [] });
    }

    // ── dashboard stats ───────────────────────────────────────
    if (type === 'stats') {
      const [
        { count: totalUsers },
        { count: activeJobs },
        { count: completedJobs },
        { data: recentJobs },
        { data: roleData },
        { data: dailyRevenue },
        { data: pendingPayouts },
      ] = await Promise.all([
        adminClient.from('profilkisi').select('*', { count: 'exact', head: true }),
        adminClient.from('requests').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'arrived', 'picked_up']),
        adminClient.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        adminClient.from('requests').select('created_at, status, amount').order('created_at', { ascending: false }).limit(300),
        adminClient.from('profilkisi').select('roles'),
        adminClient.from('transactions').select('amount, created_at, type').eq('type', 'commission').order('created_at', { ascending: false }).limit(500),
        adminClient.from('requests').select('amount, receiver_id, sender_id').eq('status', 'completed').eq('payment_status', 'held').limit(100),
      ]);

      // Talep/Arz oranı
      const seekers = (roleData || []).filter(u => {
        const r = Array.isArray(u.roles) ? u.roles : [];
        return r.some(x => ['kurye','emanetci','siraci','hepsi'].includes(x));
      }).length;
      const givers = (totalUsers || 0) - seekers;

      // Günlük gelir (son 14 gün)
      const now = new Date();
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (13 - i));
        return d.toISOString().slice(0, 10);
      });
      const revenueByDay = {};
      for (const d of days) revenueByDay[d] = 0;
      for (const tx of (dailyRevenue || [])) {
        const day = tx.created_at?.slice(0, 10);
        if (day && revenueByDay[day] !== undefined) revenueByDay[day] += Number(tx.amount || 0);
      }
      const revenueChart = days.map(d => ({ date: d.slice(5), amount: revenueByDay[d] }));

      // Tamamlanan vs aktif (donut)
      const donut = [
        { name: 'Tamamlanan', value: completedJobs || 0 },
        { name: 'Aktif', value: activeJobs || 0 },
      ];

      // Ortalama tamamlama süresi (dakika)
      const completedWithTime = (recentJobs || []).filter(j => j.status === 'completed' && j.created_at);
      const avgMinutes = completedWithTime.length
        ? Math.round(completedWithTime.reduce((s, j) => s + (Date.now() - new Date(j.created_at).getTime()) / 60000, 0) / completedWithTime.length)
        : 0;

      // Bekleyen ödeme tutarı
      const pendingAmount = (pendingPayouts || []).reduce((s, r) => s + Number(r.amount || 0), 0);

      return NextResponse.json({
        totalUsers: totalUsers || 0,
        activeJobs: activeJobs || 0,
        completedJobs: completedJobs || 0,
        seekers, givers,
        avgMinutes,
        pendingAmount,
        revenueChart,
        donut,
      });
    }

    // ── disputes (raporlanan kullanıcılar) ───────────────────
    if (type === 'reports') {
      const { data, error: err } = await adminClient
        .from('reports')
        .select('*, reporter:profilkisi!reporter_id(name, email), target:profilkisi!target_id(name, email, is_banned)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) return NextResponse.json({ reports: [] });
      return NextResponse.json({ reports: data || [] });
    }

    // ── fotoğraf kanıt arşivi ─────────────────────────────────
    if (type === 'proofs') {
      const { data, error: err } = await adminClient
        .from('messages')
        .select('*, request:requests!request_id(id, status, sender_id, receiver_id)')
        .eq('type', 'image')
        .not('metadata', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) return NextResponse.json({ proofs: [] });
      return NextResponse.json({ proofs: data || [] });
    }

    // ── sohbet izleme (belirli request) ──────────────────────
    if (type === 'chat') {
      const requestId = searchParams.get('request_id');
      if (!requestId) return NextResponse.json({ messages: [] });
      const { data, error: err } = await adminClient
        .from('messages')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      if (err) return NextResponse.json({ messages: [] });
      return NextResponse.json({ messages: data || [] });
    }

    // ── yorum moderasyonu ─────────────────────────────────────
    if (type === 'reviews') {
      const { data, error: err } = await adminClient
        .from('profilreviews')
        .select('*, target:profilkisi!target_id(name), reviewer:profilkisi!reviewer_id(name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (err) return NextResponse.json({ reviews: [] });
      return NextResponse.json({ reviews: data || [] });
    }

    // ── para çekme talepleri ──────────────────────────────────
    if (type === 'withdrawals') {
      const { data, error: err } = await adminClient
        .from('withdrawal_requests')
        .select('*, profilkisi(name, email, phone)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) return NextResponse.json({ withdrawals: [] });
      return NextResponse.json({ withdrawals: data || [] });
    }

    // ── duyurular ─────────────────────────────────────────────
    if (type === 'announcements') {
      const { data, error: err } = await adminClient
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (err) return NextResponse.json({ announcements: [] });
      return NextResponse.json({ announcements: data || [] });
    }

    // ── users (default) ───────────────────────────────────────
    const { data: users, error: usersErr } = await adminClient
      .from('profilkisi')
      .select('user_id, name, email, phone, is_admin, is_banned, is_verified, created_at, rating, roles, average_rating, total_completed_jobs, stripe_account_id')
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

    const body = await req.json().catch(() => ({}));
    const { action, targetUserId, reviewId, withdrawalId, title, body: annBody, adminId } = body;
    if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

    if (action === 'ban') {
      await adminClient.from('profilkisi').update({ is_banned: true }).eq('user_id', targetUserId);
      return NextResponse.json({ success: true, action: 'banned' });
    }
    if (action === 'unban') {
      await adminClient.from('profilkisi').update({ is_banned: false }).eq('user_id', targetUserId);
      return NextResponse.json({ success: true, action: 'unbanned' });
    }
    if (action === 'verify') {
      await adminClient.from('profilkisi').update({ is_verified: true }).eq('user_id', targetUserId);
      return NextResponse.json({ success: true, action: 'verified' });
    }
    if (action === 'unverify') {
      await adminClient.from('profilkisi').update({ is_verified: false }).eq('user_id', targetUserId);
      return NextResponse.json({ success: true, action: 'unverified' });
    }
    if (action === 'hide_review') {
      await adminClient.from('profilreviews').update({ hidden: true }).eq('id', reviewId);
      return NextResponse.json({ success: true });
    }
    if (action === 'send_announcement') {
      await adminClient.from('announcements').insert({ title, body: annBody, created_by: adminId });
      return NextResponse.json({ success: true });
    }
    if (action === 'approve_withdrawal') {
      await adminClient.from('withdrawal_requests').update({ status: 'approved' }).eq('id', withdrawalId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
