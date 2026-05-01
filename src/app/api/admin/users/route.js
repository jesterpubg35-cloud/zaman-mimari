import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const ADMIN_PANEL_KEY = createHash('sha256').update('Uguryigit35x.' + 'tick_admin_salt_2025').digest('hex');

// === EVRENSEL ROL SABITLERI ===
// Tüm hizmet veren (provider) rolleri - finansal işlemlerde kullanılır
const PROVIDER_ROLES = ['kurye', 'emanetci', 'siraci', 'rehber', 'hepsi'];
const CUSTOMER_ROLES = ['musteri'];

const getClients = async (req) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return { error: 'Server env missing' };

  // Panel şifre hash'i ile doğrulama (header veya Authorization Bearer)
  const adminKey = req.headers.get('x-admin-key') || '';
  const bearerToken = (req.headers.get('authorization') || '').replace(/^bearer /i, '').trim();
  const candidateKey = adminKey || bearerToken;
  if (candidateKey && candidateKey === ADMIN_PANEL_KEY) {
    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    return { adminClient, uid: 'admin' };
  }

  // Supabase token ile doğrulama (geriye dönük uyumluluk)
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

      // Talep/Arz oranı - tüm hizmet veren rolleri
      const seekers = (roleData || []).filter(u => {
        const r = Array.isArray(u.roles) ? u.roles : [];
        return r.some(x => PROVIDER_ROLES.includes(x));
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

    // ── konum geçmişi ─────────────────────────────────────────
    if (type === 'location_history') {
      const userId = searchParams.get('user_id');
      if (!userId) return NextResponse.json({ history: [] });
      const { data, error: err } = await adminClient
        .from('location_history')
        .select('lat, lng, recorded_at')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(200);
      if (err) return NextResponse.json({ history: [] });
      return NextResponse.json({ history: data || [] });
    }

    // ── giriş denemeleri ──────────────────────────────────────
    if (type === 'login_attempts') {
      const { data, error: err } = await adminClient
        .from('admin_login_attempts')
        .select('id, email, ip_address, attempted_at, success, user_agent')
        .order('attempted_at', { ascending: false })
        .limit(200);
      if (err) return NextResponse.json({ attempts: [] });
      return NextResponse.json({ attempts: data || [] });
    }

    // ── admin logları ─────────────────────────────────────────
    if (type === 'admin_logs') {
      const { data, error: err } = await adminClient
        .from('admin_logs')
        .select('id, event_type, ip_address, user_agent, detail, created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (err) return NextResponse.json({ logs: [] });
      return NextResponse.json({ logs: data || [] });
    }

    // ── adres geçmişi ─────────────────────────────────────────
    if (type === 'address_history') {
      const { data, error: err } = await adminClient
        .from('address_history')
        .select('id, user_id, old_address, new_address, changed_at, change_type')
        .order('changed_at', { ascending: false })
        .limit(300);
      if (err) return NextResponse.json({ history: [] });
      return NextResponse.json({ history: data || [] });
    }

    // ── logs (çekmece için panele özel loglar) ─────────────────
    if (type === 'logs') {
      const logType = searchParams.get('log_type') || 'all';
      let logs = [];

      if (logType === 'all' || logType === 'system') {
        const { data } = await adminClient.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(50);
        logs = [...logs, ...(data || []).map(l => ({ ...l, source: 'admin_logs' }))];
      }
      if (logType === 'all' || logType === 'login_attempts') {
        const { data } = await adminClient.from('admin_login_attempts').select('*').order('attempted_at', { ascending: false }).limit(50);
        logs = [...logs, ...(data || []).map(l => ({ ...l, created_at: l.attempted_at, source: 'login_attempts' }))];
      }
      if (logType === 'all' || logType === 'user_actions') {
        // Kullanıcı ban/verify işlemleri admin_logs'tan filtrelenir
        const { data } = await adminClient.from('admin_logs').select('*').ilike('detail', '%kullanıcı%').order('created_at', { ascending: false }).limit(30);
        logs = [...logs, ...(data || []).map(l => ({ ...l, source: 'user_actions' }))];
      }
      if (logType === 'financial') {
        const { data } = await adminClient.from('transactions').select('*, profilkisi(name)').order('created_at', { ascending: false }).limit(30);
        logs = [...logs, ...(data || []).map(t => ({ event_type: t.type, detail: `₺${t.amount} - ${t.profilkisi?.name || '-'}`, created_at: t.created_at, source: 'transactions' }))];
      }
      if (logType === 'reports') {
        const { data } = await adminClient.from('reports').select('*, reporter:reporter_id(name), reported:reported_id(name)').order('created_at', { ascending: false }).limit(30);
        logs = [...logs, ...(data || []).map(r => ({ event_type: 'Rapor', detail: `${r.reporter?.name} → ${r.reported?.name}: ${r.reason}`, created_at: r.created_at, source: 'reports' }))];
      }

      // Tüm logları tarihe göre sırala
      logs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return NextResponse.json({ logs: logs.slice(0, 50) });
    }

    // ── users (default) ───────────────────────────────────────
    // auth.users tablosundan tüm kullanıcıları çek (hayalet kullanıcıları da görmek için)
    const { data: authUsers, error: authErr } = await adminClient.auth.admin.listUsers();
    if (authErr) return NextResponse.json({ error: 'Auth users fetch failed', detail: authErr.message }, { status: 500 });

    // profilkisi tablosundaki profilleri çek
    const { data: profiles, error: profilesErr } = await adminClient
      .from('profilkisi')
      .select('user_id, name, email, phone, birth_date, is_admin, is_banned, is_verified, created_at, rating, roles, average_rating, total_completed_jobs, stripe_account_id, ip_address, registered_ip, address_line1, address_line2, city, district, neighborhood, postal_code, country');

    if (profilesErr) return NextResponse.json({ error: profilesErr.message, code: profilesErr.code }, { status: 500 });

    // Birleştir: Tüm auth.users + profilkisi bilgileri (LEFT JOIN mantığı)
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    
    const mergedUsers = (authUsers?.users || []).map(authUser => {
      const profile = profileMap.get(authUser.id);
      return {
        user_id: authUser.id,
        email: authUser.email || profile?.email || '',
        name: profile?.name || authUser.user_metadata?.name || 'İsimsiz Kullanıcı',
        phone: profile?.phone || authUser.user_metadata?.phone || '',
        birth_date: profile?.birth_date || null,
        is_admin: profile?.is_admin || false,
        is_banned: profile?.is_banned || false,
        is_verified: profile?.is_verified || false,
        created_at: authUser.created_at || profile?.created_at,
        rating: profile?.rating || 0,
        roles: profile?.roles || ['musteri'],
        average_rating: profile?.average_rating || 0,
        total_completed_jobs: profile?.total_completed_jobs || 0,
        stripe_account_id: profile?.stripe_account_id || null,
        ip_address: profile?.ip_address || authUser.last_sign_in_at || '',
        registered_ip: profile?.registered_ip || '',
        address_line1: profile?.address_line1 || '',
        address_line2: profile?.address_line2 || '',
        city: profile?.city || '',
        district: profile?.district || '',
        neighborhood: profile?.neighborhood || '',
        postal_code: profile?.postal_code || '',
        country: profile?.country || '',
        // Profil durumu
        is_profile_complete: !!profile?.name && !!profile?.phone
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ users: mergedUsers, count: mergedUsers.length });
  } catch (e) {
    return NextResponse.json({ error: 'Server error', detail: e?.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { adminClient, error } = await getClients(req);
    if (error) return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 401 });

    const body = await req.json().catch(() => ({}));
    const { action, targetUserId, reviewId, withdrawalId, title, body: annBody, adminId, target, link } = body;
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
      // 1. Duyuruyu kaydet
      await adminClient.from('announcements').insert({ title, body: annBody, target: target || 'all', link: link || null });

      // 2. Hedef kullanıcıları belirle
      let query = adminClient.from('profilkisi').select('user_id, roles');
      const { data: allUsers } = await query;
      const targetUsers = (allUsers || []).filter(u => {
        if (target === 'providers') {
          const r = Array.isArray(u.roles) ? u.roles : [];
          return r.some(x => PROVIDER_ROLES.includes(x));
        }
        if (target === 'customers') {
          const r = Array.isArray(u.roles) ? u.roles : [];
          return r.includes('musteri') || r.length === 0;
        }
        return true; // 'all'
      });

      // 3. Her kullanıcıya notifications kaydı oluştur (toplu)
      if (targetUsers.length > 0) {
        const rows = targetUsers.map(u => ({
          user_id: u.user_id,
          title,
          body: annBody,
          type: 'announcement',
          link: link || null,
          is_read: false,
        }));
        await adminClient.from('notifications').insert(rows);
      }

      return NextResponse.json({ success: true, sent: targetUsers.length });
    }
    if (action === 'approve_withdrawal') {
      await adminClient.from('withdrawal_requests').update({ status: 'approved' }).eq('id', withdrawalId);
      return NextResponse.json({ success: true });
    }
    if (action === 'log_login_attempt') {
      const { email: attemptEmail, success: attemptSuccess } = body;
      await adminClient.from('admin_login_attempts').insert({
        email: attemptEmail || 'unknown',
        success: Boolean(attemptSuccess),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
        user_agent: req.headers.get('user-agent') || null,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
