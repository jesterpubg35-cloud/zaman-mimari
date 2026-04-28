'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const ADMIN_EMAIL = 'uguryigitkarakuzu@gmail.com';
const DONUT_COLORS = ['#2ECC71', '#4b5563', '#6b7280', '#9ca3af'];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
  );
}

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function apiFetch(adminKey, type, extra = '') {
  const res = await fetch(`/api/admin/users?type=${type}${extra}`, {
    headers: { 'x-admin-key': adminKey, 'Authorization': `Bearer ${adminKey}` },
    cache: 'no-store',
  });
  return res.json().catch(() => ({}));
}

async function apiPost(adminKey, body) {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'x-admin-key': adminKey, 'Authorization': `Bearer ${adminKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

// ─── Stat Kart ─────────────────────────────────────────────
function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-1">
      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      <div className={`text-3xl font-black ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-600">{sub}</div>}
    </div>
  );
}

// ─── Sekme butonları ────────────────────────────────────────
function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition border ${
        active
          ? 'bg-emerald-500 text-black border-emerald-500'
          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Ana Bileşen ────────────────────────────────────────────
export default function AdminDashboard() {
  // ── Auth ──────────────────────────────────────────────────
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState(''); // sha256(password+salt)
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState('dashboard');

  // Hatalı giriş takibi
  const [adminAttempts, setAdminAttempts] = useState([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  // Admin logları
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminLogsLoading, setAdminLogsLoading] = useState(false);

  // Adres geçmişi
  const [addressHistory, setAddressHistory] = useState([]);
  const [addressHistoryLoading, setAddressHistoryLoading] = useState(false);

  // Dashboard
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Kullanıcılar
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQ, setUserQ] = useState('');
  const [filterRole, setFilterRole] = useState('hepsi');
  const [filterBanned, setFilterBanned] = useState('hepsi');
  const [expandedUser, setExpandedUser] = useState(null);
  const [locationHistory, setLocationHistory] = useState({});
  const [locationLoading, setLocationLoading] = useState({});
  const [filterVerified, setFilterVerified] = useState('hepsi');

  // Raporlar & Kanıtlar
  const [reports, setReports] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [proofModal, setProofModal] = useState(null);
  const [chatModal, setChatModal] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  // Yorumlar
  const [reviews, setReviews] = useState([]);

  // Finansal
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [refundModal, setRefundModal] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);

  // Duyurular / Bildirim Merkezi
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annTarget, setAnnTarget] = useState('all');
  const [annLink, setAnnLink] = useState('');

  // Öneriler
  const [suggestions, setSuggestions] = useState([]);

  // Güvenlik Radarı
  const [radar, setRadar] = useState([]);
  const [radarLoading, setRadarLoading] = useState(false);

  // Growth / Referans
  const [growth, setGrowth] = useState([]);

  const [toast, setToast] = useState('');
  const realtimeRef = useRef(null);
  const [rtNotifs, setRtNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const rtNotifId = useRef(0);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const pushNotif = (icon, title, detail) => {
    const id = ++rtNotifId.current;
    setRtNotifs(prev => [{ id, icon, title, detail, ts: new Date() }, ...prev].slice(0, 50));
    // 6 sn sonra otomatik kapat (sadece görsel bildirim, liste kalır)
    setTimeout(() => setRtNotifs(prev => prev.map(n => n.id === id ? { ...n, fading: true } : n)), 5500);
  };

  // ── Auth kontrolü ───────────────────────────────────────
  useEffect(() => {
    setAuthChecked(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginErr('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const j = await res.json();
      if (!res.ok) { setLoginErr(j.error || 'Hatalı şifre.'); return; }
      // Başarılı — API için kullanılacak hash'i hesapla
      const key = await sha256hex(loginPassword + 'tick_admin_salt_2025');
      setAdminKey(key);
      setIsAdmin(true);
    } catch (err) {
      setLoginErr(err?.message || 'Sunucu hatası.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Realtime ────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin || !adminKey) return;
    const sb = getSupabase();
    const ch = sb.channel('admin-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, (payload) => {
        loadStats();
        pushNotif('📦', 'Yeni İş İsteği', `#${(payload.new?.id || '').slice(0,8)} oluşturuldu`);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, (payload) => {
        loadStats();
        const s = payload.new?.status;
        const labels = { completed: '✅ İş Tamamlandı', cancelled: '❌ İş İptal Edildi', accepted: '👌 İş Kabul Edildi', picked_up: '🚚 Kurye Teslim Aldı' };
        if (labels[s]) pushNotif(labels[s].split(' ')[0], labels[s].slice(2), `#${(payload.new?.id || '').slice(0,8)}`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profilkisi' }, (payload) => {
        loadUsers(); loadStats();
        pushNotif('👤', 'Yeni Kayıt', payload.new?.email || payload.new?.name || 'Yeni kullanıcı');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        loadReports();
        pushNotif('⚠️', 'Yeni İtiraz', `Rapor #${(payload.new?.id || '').slice(0,8)}`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        loadStats(); loadTransactions();
        const amt = payload.new?.amount ? `₺${Number(payload.new.amount).toFixed(2)}` : '';
        pushNotif('💰', 'Yeni İşlem', `${payload.new?.type || ''} ${amt}`.trim());
      })
      .subscribe();
    realtimeRef.current = ch;
    return () => { sb.removeChannel(ch); };
  }, [isAdmin, adminKey]);

  // ── Veri Yükleyiciler ───────────────────────────────────
  const loadStats = useCallback(async () => {
    if (!adminKey) return;
    setStatsLoading(true);
    const data = await apiFetch(adminKey, 'stats');
    setStats(data);
    setStatsLoading(false);
  }, [adminKey]);

  const loadUsers = useCallback(async () => {
    if (!adminKey) return;
    setUsersLoading(true);
    const data = await apiFetch(adminKey, 'users');
    setUsers(data.users || []);
    setUsersLoading(false);
  }, [adminKey]);

  const loadReports = useCallback(async () => {
    if (!adminKey) return;
    setReports([]);
    const data = await apiFetch(adminKey, 'reports');
    setReports(data.reports || []);
  }, [adminKey]);

  const loadProofs = useCallback(async () => {
    if (!adminKey) return;
    const data = await apiFetch(adminKey, 'proofs');
    setProofs(data.proofs || []);
  }, [adminKey]);

  const loadReviews = useCallback(async () => {
    if (!adminKey) return;
    const data = await apiFetch(adminKey, 'reviews');
    setReviews(data.reviews || []);
  }, [adminKey]);

  const loadTransactions = useCallback(async () => {
    if (!adminKey) return;
    setTransactions([]);
    const [txData, wdData] = await Promise.all([
      apiFetch(adminKey, 'transactions'),
      apiFetch(adminKey, 'withdrawals'),
    ]);
    setTransactions(txData.transactions || []);
    setWithdrawals(wdData.withdrawals || []);
  }, [adminKey]);

  const loadAnnouncements = useCallback(async () => {
    if (!adminKey) return;
    const data = await apiFetch(adminKey, 'announcements');
    setAnnouncements(data.announcements || []);
  }, [adminKey]);

  const loadChat = async (requestId) => {
    const data = await apiFetch(adminKey, 'chat', `&request_id=${requestId}`);
    setChatMessages(data.messages || []);
    setChatModal(requestId);
  };

  const loadRadar = useCallback(async () => {
    if (!adminKey) return;
    setRadarLoading(true);
    const sb = getSupabase();
    const adminSb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );
    // Hızlı tamamlanan işler (2dk altı)
    const { data: fastJobs } = await adminSb.from('requests')
      .select('id, sender_id, receiver_id, created_at, updated_at, amount')
      .eq('status', 'completed').limit(200);
    const flags = [];
    for (const j of (fastJobs || [])) {
      const diff = (new Date(j.updated_at) - new Date(j.created_at)) / 60000;
      if (diff < 2 && diff > 0) flags.push({ type: 'Hızlı İşlem', detail: `${diff.toFixed(1)}dk'da tamamlandı`, sender: j.sender_id, receiver: j.receiver_id, id: j.id });
    }
    setRadar(flags);
    setRadarLoading(false);
  }, [adminKey]);

  const loadSuggestions = useCallback(async () => {
    const sb = getSupabase();
    const { data } = await sb.from('suggestions').select('*').order('created_at', { ascending: false });
    setSuggestions(data || []);
  }, []);

  const loadAdminAttempts = useCallback(async () => {
    if (!adminKey) return;
    setAttemptsLoading(true);
    const data = await apiFetch(adminKey, 'login_attempts');
    setAdminAttempts(data.attempts || []);
    setAttemptsLoading(false);
  }, [adminKey]);

  const loadAdminLogs = useCallback(async () => {
    if (!adminKey) return;
    setAdminLogsLoading(true);
    const data = await apiFetch(adminKey, 'admin_logs');
    setAdminLogs(data.logs || []);
    setAdminLogsLoading(false);
  }, [adminKey]);

  const loadAddressHistory = useCallback(async () => {
    if (!adminKey) return;
    setAddressHistoryLoading(true);
    const data = await apiFetch(adminKey, 'address_history');
    setAddressHistory(data.history || []);
    setAddressHistoryLoading(false);
  }, [adminKey]);

  const loadGrowth = useCallback(async () => {
    if (!adminKey) return;
    const data = await apiFetch(adminKey, 'users');
    const us = data.users || [];
    const map = {};
    for (const u of us) {
      if (u.referred_by) {
        if (!map[u.referred_by]) map[u.referred_by] = { count: 0, name: '' };
        map[u.referred_by].count++;
      }
    }
    for (const u of us) {
      if (map[u.user_id]) map[u.user_id].name = u.name || u.user_id?.slice(0, 8);
    }
    const list = Object.entries(map).map(([uid, v]) => ({ uid, name: v.name || uid.slice(0, 8), count: v.count })).sort((a, b) => b.count - a.count);
    setGrowth(list);
  }, [adminKey]);

  // ── Sekme değişince yükle ────────────────────────────────
  useEffect(() => {
    if (!isAdmin || !adminKey) return;
    if (tab === 'dashboard') { loadStats(); }
    if (tab === 'users') { loadUsers(); }
    if (tab === 'disputes') { loadReports(); loadProofs(); }
    if (tab === 'reviews') { loadReviews(); }
    if (tab === 'financial') { loadTransactions(); }
    if (tab === 'notifications') { loadAnnouncements(); }
    if (tab === 'radar') { loadRadar(); }
    if (tab === 'growth') { loadGrowth(); }
    if (tab === 'suggestions') { loadSuggestions(); }
    if (tab === 'attempts') { loadAdminAttempts(); }
    if (tab === 'address_history') { loadAddressHistory(); }
    if (tab === 'admin_logs') { loadAdminLogs(); }
  }, [tab, isAdmin, adminKey]);

  // ── Aksiyonlar ───────────────────────────────────────────
  const userAction = async (action, targetUserId) => {
    await apiPost(adminKey, { action, targetUserId });
    showToast('İşlem tamam ✓');
    loadUsers();
  };

  const hideReview = async (reviewId) => {
    await apiPost(adminKey, { action: 'hide_review', reviewId });
    showToast('Yorum gizlendi ✓');
    loadReviews();
  };

  const approveWithdrawal = async (withdrawalId) => {
    await apiPost(adminKey, { action: 'approve_withdrawal', withdrawalId });
    showToast('Para çekme onaylandı ✓');
    loadTransactions();
  };

  const sendAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    await apiPost(adminKey, {
      action: 'send_announcement',
      title: annTitle,
      body: annBody,
      target: annTarget,
      link: annLink,
    });
    setAnnTitle(''); setAnnBody(''); setAnnLink('');
    showToast('Bildirim gönderildi ✓');
    loadAnnouncements();
  };

  if (!authChecked) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </main>
  );

  if (!isAdmin) return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <style>{`
        @keyframes neonPulse {
          0%,100% { box-shadow: 0 0 0 1px rgba(30,64,175,0.25), 0 0 32px rgba(37,99,235,0.06); }
          50%      { box-shadow: 0 0 0 1.5px rgba(59,130,246,0.6), 0 0 56px rgba(59,130,246,0.2), 0 0 100px rgba(59,130,246,0.07); }
        }
        @keyframes bgGlow {
          0%,100% { opacity:.07; transform:translate(-50%,-50%) scale(1); }
          50%      { opacity:.18; transform:translate(-50%,-50%) scale(1.1); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shake {
          0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)}
        }
        .shake { animation: shake 0.4s ease; }
      `}</style>

      {/* Arka plan neon halka */}
      <div style={{ position:'absolute', top:'50%', left:'50%', width:800, height:800, borderRadius:'50%', background:'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', transform:'translate(-50%,-50%)', animation:'bgGlow 5s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'50%', left:'50%', width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', transform:'translate(-50%,-50%)', animation:'bgGlow 3s ease-in-out infinite reverse', pointerEvents:'none' }} />

      {/* Kart */}
      <form
        onSubmit={handleLogin}
        className={`relative w-full max-w-[340px] rounded-2xl p-8 flex flex-col gap-6${loginErr ? ' shake' : ''}`}
        style={{ background:'rgba(0,2,18,0.97)', animation:'neonPulse 4s ease-in-out infinite, fadeUp 0.5s ease-out both' }}
      >
        {/* Başlık */}
        <div className="text-center">
          <p className="text-[10px] font-mono tracking-[0.45em] text-blue-600/50 uppercase mb-3">secure access</p>
          <h1 className="text-[2.2rem] font-black tracking-[0.12em] leading-none"
            style={{ color:'#3b82f6', textShadow:'0 0 28px rgba(59,130,246,0.8), 0 0 60px rgba(59,130,246,0.35)' }}>TICK</h1>
          <p className="text-[10px] font-mono tracking-[0.3em] text-blue-400/30 uppercase mt-2">admin panel</p>
        </div>

        {/* Hata */}
        {loginErr && (
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
            style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)' }}>
            <span className="text-red-500 text-base leading-none">⚠</span>
            <span className="text-[11px] font-mono text-red-300/90">{loginErr}</span>
          </div>
        )}

        {/* Şifre kutusu */}
        <div>
          <label className="block text-[10px] font-mono tracking-[0.35em] text-blue-400/40 uppercase mb-2">Şifre</label>
          <input
            type="password"
            value={loginPassword}
            onChange={e => { setLoginPassword(e.target.value); setLoginErr(''); }}
            placeholder="••••••••••••"
            required
            autoFocus
            disabled={loginLoading}
            className="w-full rounded-xl px-4 py-3.5 text-sm text-white font-mono outline-none transition-all"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(59,130,246,0.28)', letterSpacing:'0.15em' }}
            onFocus={e => { e.target.style.borderColor='rgba(59,130,246,0.75)'; e.target.style.boxShadow='0 0 16px rgba(59,130,246,0.18)'; }}
            onBlur={e  => { e.target.style.borderColor='rgba(59,130,246,0.28)'; e.target.style.boxShadow='none'; }}
          />
        </div>

        {/* Buton */}
        <button
          type="submit"
          disabled={loginLoading}
          className="py-3.5 rounded-xl font-black text-sm tracking-[0.25em] uppercase font-mono transition-all disabled:opacity-40"
          style={{
            background:'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
            color:'#e0f2fe',
            boxShadow:'0 0 24px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
            border:'1px solid rgba(59,130,246,0.4)',
          }}
        >
          {loginLoading
            ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border border-blue-300/40 border-t-blue-200 rounded-full animate-spin" /> DOĞRULANIYOR</span>
            : '→ PANELİ AÇ'}
        </button>

        {/* Alt bant */}
        <div className="flex items-center justify-between -mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] font-mono text-blue-500/30 tracking-widest">ENCRYPTED</span>
          </div>
          <span className="text-[9px] font-mono text-white/8 tracking-widest">YETKİSİZ ERİŞİM YASAK</span>
        </div>
      </form>
    </main>
  );

  // ── Filtreli kullanıcılar ─────────────────────────────────
  const filteredUsers = users
    .filter(u => {
      const q = userQ.trim().toLowerCase();
      const matchQ = !q || [u.name, u.email, u.phone, u.user_id].some(v => v?.toLowerCase().includes(q));
      const roles = Array.isArray(u.roles) ? u.roles : [u.role || 'musteri'];
      const matchRole = filterRole === 'hepsi' || roles.includes(filterRole);
      const matchBanned = filterBanned === 'hepsi' || (filterBanned === 'banned' ? u.is_banned : !u.is_banned);
      const matchVerified = filterVerified === 'hepsi' || (filterVerified === 'verified' ? u.is_verified : !u.is_verified);
      return matchQ && matchRole && matchBanned && matchVerified;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));

  const proofGroups = proofs.reduce((acc, p) => {
    const key = p.request_id || p.id;
    if (!acc[key]) acc[key] = { request: p.request, items: [] };
    acc[key].items.push(p);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <style>{`
        @keyframes rtSlideIn  { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }
        @keyframes rtSlideOut { from { opacity:1; transform:translateX(0); }   to { opacity:0; transform:translateX(60px); } }
        .rt-notif-enter { animation: rtSlideIn  0.3s ease-out both; }
        .rt-notif-exit  { animation: rtSlideOut 0.3s ease-in  both; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] bg-emerald-500 text-black font-black px-5 py-3 rounded-2xl shadow-xl text-sm">
          {toast}
        </div>
      )}

      {/* Realtime bildirim yığını — sağ alt */}
      <div className="fixed bottom-5 right-5 z-[9990] flex flex-col-reverse gap-2 pointer-events-none" style={{ maxWidth: 320 }}>
        {rtNotifs.filter(n => !n.fading && !n.read).slice(0, 4).map(n => (
          <div key={n.id}
            className={`rt-notif-enter pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl border cursor-pointer`}
            style={{ background: 'rgba(9,9,11,0.97)', borderColor: 'rgba(52,211,153,0.2)' }}
            onClick={() => setRtNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true, fading: true } : x))}
          >
            <span className="text-xl flex-shrink-0">{n.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black text-white">{n.title}</p>
              <p className="text-[11px] text-zinc-400 truncate">{n.detail}</p>
            </div>
            <span className="text-[9px] text-zinc-600 flex-shrink-0 font-mono mt-0.5">
              {n.ts.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* İade Modal */}
      {refundModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-black text-sm">Stripe İadesi</h3>
            <p className="text-xs text-zinc-400">{refundModal.profilkisi?.name} · <span className="text-white font-bold">₺{Number(refundModal.amount||0).toFixed(2)}</span></p>
            <p className="text-[11px] text-zinc-500">Payment Intent: {refundModal.payment_intent_id || 'Bulunamadı'}</p>
            <div className="flex gap-2">
              <button onClick={() => setRefundModal(null)} className="flex-1 py-2.5 bg-zinc-800 rounded-xl text-sm font-bold">Vazgeç</button>
              <button onClick={() => sendRefund(refundModal)} disabled={refundLoading || !refundModal.payment_intent_id}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-black disabled:opacity-50">
                {refundLoading ? '...' : 'İade Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatModal && (
        <div className="fixed inset-0 z-[9998] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <span className="font-black text-sm">Sohbet — {chatModal.slice(0, 8)}...</span>
              <button onClick={() => setChatModal(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(m => (
                <div key={m.id} className="bg-zinc-800 rounded-xl p-3">
                  <div className="text-[10px] text-zinc-500 mb-1">{m.sender_id?.slice(0, 8)} · {new Date(m.created_at).toLocaleTimeString()}</div>
                  {m.type === 'image' ? <img src={m.content} alt="" className="max-h-32 rounded-lg" /> : <p className="text-sm">{m.content}</p>}
                  {m.metadata?.label && <span className="text-[10px] font-black text-emerald-400">{m.metadata.label === 'teslim_aldim' ? 'Teslim Aldım' : 'Teslim Ettim'}</span>}
                </div>
              ))}
              {!chatMessages.length && <p className="text-zinc-600 text-sm text-center">Mesaj yok</p>}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-xl font-black text-emerald-400">TICK</div>
            <div className="text-[11px] text-zinc-600 font-bold uppercase tracking-widest">Admin Paneli</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-zinc-500 font-bold">Canlı</span>
            </div>
            {/* Bildirim zili */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-zinc-600 transition"
              >
                <span className="text-base">🔔</span>
                {rtNotifs.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-black flex items-center justify-center">
                    {rtNotifs.filter(n => !n.read).length > 9 ? '9+' : rtNotifs.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-[9998] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Canlı Bildirimler</span>
                    <button onClick={() => { setRtNotifs(prev => prev.map(n => ({ ...n, read: true }))); }} className="text-[10px] text-zinc-600 hover:text-zinc-400 font-bold">Tamamını Oku</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {rtNotifs.length === 0 && (
                      <div className="px-4 py-8 text-center text-zinc-600 text-xs">Henüz bildirim yok</div>
                    )}
                    {rtNotifs.map(n => (
                      <div key={n.id} onClick={() => setRtNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-zinc-900 cursor-pointer hover:bg-zinc-900 transition ${n.read ? 'opacity-50' : ''}`}>
                        <span className="text-xl flex-shrink-0 mt-0.5">{n.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-black text-white">{n.title}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{n.detail}</p>
                        </div>
                        <span className="text-[9px] text-zinc-600 flex-shrink-0 font-mono mt-1">
                          {n.ts.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <Tab active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>Dashboard</Tab>
          <Tab active={tab === 'users'} onClick={() => setTab('users')}>Kullanıcılar</Tab>
          <Tab active={tab === 'disputes'} onClick={() => setTab('disputes')}>İtiraz & Kanıt</Tab>
          <Tab active={tab === 'reviews'} onClick={() => setTab('reviews')}>Yorumlar</Tab>
          <Tab active={tab === 'financial'} onClick={() => setTab('financial')}>Finansal</Tab>
          <Tab active={tab === 'notifications'} onClick={() => setTab('notifications')}>Bildirim Merkezi</Tab>
          <Tab active={tab === 'radar'} onClick={() => setTab('radar')}>Güvenlik Radarı</Tab>
          <Tab active={tab === 'growth'} onClick={() => setTab('growth')}>Büyüme</Tab>
          <Tab active={tab === 'suggestions'} onClick={() => setTab('suggestions')}>Öneriler</Tab>
          <Tab active={tab === 'attempts'} onClick={() => setTab('attempts')}>🔐 Giriş Denemeleri</Tab>
          <Tab active={tab === 'address_history'} onClick={() => setTab('address_history')}>📍 Adres Geçmişi</Tab>
          <Tab active={tab === 'admin_logs'} onClick={() => setTab('admin_logs')}>📶 Admin Logları</Tab>
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div>
            {statsLoading && <p className="text-zinc-600 text-sm mb-4">Yükleniyor...</p>}
            {stats && (<>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <StatCard label="Toplam Kullanıcı" value={stats.totalUsers} />
                <StatCard label="Aktif İş" value={stats.activeJobs} accent />
                <StatCard label="Tamamlanan" value={stats.completedJobs} accent />
                <StatCard label="Ort. Süre" value={`${stats.avgMinutes}dk`} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <StatCard label="Hizmet Verenler" value={stats.seekers} sub="Aktif rol sahibi" />
                <StatCard label="İş Verenler" value={stats.givers} sub="Müşteri rolü" />
                <StatCard label="Bekleyen Ödeme" value={`₺${stats.pendingAmount?.toFixed(0)}`} sub="Escrow'da" accent />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">Son 14 Günlük Komisyon Geliri</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stats.revenueChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#52525b', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} labelStyle={{ color: '#a1a1aa' }} itemStyle={{ color: '#2ECC71' }} />
                      <Line type="monotone" dataKey="amount" stroke="#2ECC71" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">İş Durumu Dağılımı</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={stats.donut} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                        {stats.donut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                      </Pie>
                      <Legend formatter={(v) => <span style={{ color: '#71717a', fontSize: 11 }}>{v}</span>} />
                      <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>)}
          </div>
        )}

        {/* ── KULLANICILAR ── */}
        {tab === 'users' && (
          <div className="flex gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 mb-4">
                <input value={userQ} onChange={e => setUserQ(e.target.value)} placeholder="İsim, email, telefon ara..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none text-white placeholder:text-zinc-600" />
                <button onClick={loadUsers} className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 hover:text-white">Yenile</button>
              </div>
              <p className="text-[11px] text-zinc-600 mb-3">{filteredUsers.length} kullanıcı — alfabetik sıralı</p>
              {usersLoading ? <p className="text-zinc-600 text-sm">Yükleniyor...</p> : (
                <div className="space-y-2">
                  {filteredUsers.map(u => {
                    const isOpen = expandedUser === u.user_id;
                    return (
                    <div key={u.user_id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center font-black text-zinc-400 text-sm flex-shrink-0">
                          {(u.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm">{u.name || '—'}</span>
                            {u.is_verified && <span className="text-[9px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded font-black">Onaylı</span>}
                            {u.is_banned && <span className="text-[9px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded font-black">Banlı</span>}
                          </div>
                          <div className="text-[11px] text-zinc-500">{u.email} · {u.phone}</div>
                          <div className="text-[10px] text-zinc-600">{u.average_rating || 0} puan · {u.total_completed_jobs || 0} iş · {new Date(u.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          {!u.is_verified
                            ? <button onClick={() => userAction('verify', u.user_id)} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg font-black hover:border-emerald-700 hover:text-emerald-400">Onayla</button>
                            : <button onClick={() => userAction('unverify', u.user_id)} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-500 rounded-lg font-black">Kaldır</button>}
                          {!u.is_banned
                            ? <button onClick={() => userAction('ban', u.user_id)} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-red-900/50 text-red-400 rounded-lg font-black">Ban</button>
                            : <button onClick={() => userAction('unban', u.user_id)} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-emerald-900/50 text-emerald-400 rounded-lg font-black">Banı Kaldır</button>}
                          <button onClick={async () => {
                            const nextOpen = expandedUser === u.user_id ? null : u.user_id;
                            setExpandedUser(nextOpen);
                            if (nextOpen && !locationHistory[u.user_id] && !locationLoading[u.user_id]) {
                              setLocationLoading(prev => ({ ...prev, [u.user_id]: true }));
                              try {
                                const res = await fetch(`/api/admin/users?type=location_history&user_id=${u.user_id}`, { headers: { 'x-admin-key': adminKey } });
                                const json = await res.json().catch(() => ({}));
                                setLocationHistory(prev => ({ ...prev, [u.user_id]: json?.history || [] }));
                              } catch {}
                              setLocationLoading(prev => ({ ...prev, [u.user_id]: false }));
                            }
                          }} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg font-black hover:text-white">
                            {isOpen ? '▲ Kapat' : '▼ Detay'}
                          </button>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="border-t border-zinc-800 px-4 py-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
                          <div><span className="text-zinc-500 font-black">IP Adresi: </span><span className="font-mono text-zinc-300">{u.ip_address || '—'}</span></div>
                          <div><span className="text-zinc-500 font-black">Kayıt IP: </span><span className="font-mono text-zinc-300">{u.registered_ip || '—'}</span></div>
                          <div><span className="text-zinc-500 font-black">Doğum Tarihi: </span><span className="text-zinc-300">{u.birth_date || '—'}</span></div>
                          <div><span className="text-zinc-500 font-black">Ülke: </span><span className="text-zinc-300">{u.country || '—'}</span></div>
                          <div className="col-span-2"><span className="text-zinc-500 font-black">Adres: </span><span className="text-zinc-300">{[u.address_line1, u.address_line2, u.neighborhood, u.district, u.city, u.postal_code].filter(Boolean).join(', ') || '—'}</span></div>
                          <div className="col-span-2 mt-2">
                            <div className="text-zinc-500 font-black mb-1">Konum Geçmişi</div>
                            {locationLoading[u.user_id] ? <div className="text-zinc-600">Yükleniyor...</div> : (locationHistory[u.user_id] || []).length === 0 ? <div className="text-zinc-700">Kayıt yok</div> : (
                              <div className="max-h-32 overflow-y-auto space-y-0.5">
                                {(locationHistory[u.user_id] || []).map((loc, i) => (
                                  <div key={i} className="flex justify-between gap-2 py-0.5 border-b border-zinc-800">
                                    <span className="font-mono text-zinc-400">{loc.lat?.toFixed(5)}, {loc.lng?.toFixed(5)}</span>
                                    <span className="text-zinc-600 flex-shrink-0">{new Date(loc.recorded_at).toLocaleString('tr-TR')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="w-48 flex-shrink-0">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
                <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Filtrele</p>
                <div>
                  <p className="text-[10px] text-zinc-600 mb-1">Rol</p>
                  {['hepsi','musteri','kurye','emanetci','siraci','rehber'].map(r => (
                    <button key={r} onClick={() => setFilterRole(r)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold mb-0.5 ${filterRole===r ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white'}`}>
                      {r === 'hepsi' ? 'Hepsi' : r.charAt(0).toUpperCase()+r.slice(1)}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600 mb-1">Durum</p>
                  {[['hepsi','Hepsi'],['banned','Banlı'],['active','Aktif']].map(([v,l]) => (
                    <button key={v} onClick={() => setFilterBanned(v)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold mb-0.5 ${filterBanned===v ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white'}`}>{l}</button>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600 mb-1">Onay</p>
                  {[['hepsi','Hepsi'],['verified','Onaylı'],['unverified','Onaysız']].map(([v,l]) => (
                    <button key={v} onClick={() => setFilterVerified(v)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold mb-0.5 ${filterVerified===v ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white'}`}>{l}</button>
                  ))}
                </div>
                <button onClick={() => { setFilterRole('hepsi'); setFilterBanned('hepsi'); setFilterVerified('hepsi'); setUserQ(''); }} className="w-full text-[10px] py-1.5 text-zinc-600 hover:text-zinc-400">Sıfırla</button>
              </div>
            </div>
          </div>
        )}

        {/* ── İTİRAZ & KANIT ── */}
        {tab === 'disputes' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">Raporlanan Kullanıcılar</h2>
              {reports.length === 0 ? <p className="text-zinc-600 text-sm">Rapor yok</p> : (
                <div className="space-y-2">
                  {reports.map(r => (
                    <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-black text-sm">{r.target?.name || r.target_id?.slice(0,8)}</span>
                        <span className="text-zinc-500 text-xs ml-2">rapor eden: {r.reporter?.name}</span>
                        {r.reason && <p className="text-xs text-zinc-500 mt-0.5">{r.reason}</p>}
                      </div>
                      <div className="flex gap-2">
                        {r.request_id && <button onClick={() => loadChat(r.request_id)} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg font-black text-zinc-300">Sohbet</button>}
                        <button onClick={() => userAction('ban', r.target_id)} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-red-900/50 text-red-400 rounded-lg font-black">Ban</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">Fotoğraf Kanıt Arşivi</h2>
              {Object.keys(proofGroups).length === 0 ? <p className="text-zinc-600 text-sm">Kanıt fotoğrafı yok</p> : (
                <div className="space-y-4">
                  {Object.entries(proofGroups).map(([key, group]) => {
                    const teslimAlan = group.items.find(p => p.metadata?.label === 'teslim_aldim');
                    const teslimEden = group.items.find(p => p.metadata?.label === 'teslim_ettim');
                    const req = group.request;
                    return (
                      <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-800">
                          <p className="font-black text-sm">{req?.sender_id?.slice(0,8) || '?'} → {req?.receiver_id?.slice(0,8) || '?'}</p>
                          <p className="text-[11px] text-zinc-500">Hizmet: {req?.service_type || '—'} · Durum: {req?.status || '—'}</p>
                        </div>
                        <div className="grid grid-cols-2">
                          {[{item: teslimAlan, label:'Teslim Alırken'}, {item: teslimEden, label:'Teslim Ederken'}].map(({item, label}) => (
                            <div key={label} className="border-r border-zinc-800 last:border-r-0 p-3">
                              <p className="text-[10px] font-black text-zinc-500 uppercase mb-2">{label}</p>
                              {item ? (<>
                                <img src={item.content} alt="" className="w-full h-44 object-cover rounded-lg" />
                                {item.metadata?.sent_at && <p className="text-[9px] text-zinc-600 mt-1">{new Date(item.metadata.sent_at).toLocaleString()}</p>}
                                {item.metadata?.gps_lat && <p className="text-[9px] text-zinc-600">Konum: {Number(item.metadata.gps_lat).toFixed(4)}, {Number(item.metadata.gps_lng).toFixed(4)}</p>}
                              </>) : <p className="text-[11px] text-zinc-700">Fotoğraf yok</p>}
                            </div>
                          ))}
                        </div>
                        <div className="px-4 py-3 border-t border-zinc-800">
                          <button onClick={() => loadChat(key)} className="text-[10px] px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg font-black">Sohbeti İncele</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── YORUMLAR ── */}
        {tab === 'reviews' && (
          <div>
            <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">Yorum Moderasyonu</h2>
            {reviews.length === 0 ? <p className="text-zinc-600 text-sm">Yorum yok</p> : (
              <div className="space-y-2">
                {reviews.filter(r => !r.hidden).map(r => (
                  <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-zinc-300 font-black text-sm">{r.rating}/5</span>
                        <span className="text-xs text-zinc-500">{r.target?.name || '—'} ← {r.reviewer?.name || '—'}</span>
                      </div>
                      {r.comment && <p className="text-sm text-zinc-300">{r.comment}</p>}
                      <p className="text-[10px] text-zinc-600 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => hideReview(r.id)} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-red-900/50 text-red-400 rounded-lg font-black flex-shrink-0">Gizle</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FİNANSAL ── */}
        {tab === 'financial' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">Para Çekme Talepleri</h2>
              {withdrawals.length === 0 ? <p className="text-zinc-600 text-sm">Bekleyen talep yok</p> : (
                <div className="space-y-2">
                  {withdrawals.map(w => (
                    <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-4">
                      <div className="flex-1">
                        <span className="font-black text-sm">{w.profilkisi?.name}</span>
                        <span className="text-zinc-500 text-xs ml-2">{w.profilkisi?.email}</span>
                        <div className="text-emerald-400 font-black">₺{w.amount}</div>
                        <div className="text-[10px] text-zinc-600">{w.iban || w.bank_account} · {new Date(w.created_at).toLocaleDateString()}</div>
                      </div>
                      {w.status === 'pending' && <button onClick={() => approveWithdrawal(w.id)} className="px-3 py-2 bg-zinc-800 border border-emerald-800/50 text-emerald-400 rounded-xl text-xs font-black">Onayla</button>}
                      {w.status === 'approved' && <span className="text-[10px] text-emerald-500 font-black">Onaylandı</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">Son İşlemler</h2>
              <div className="space-y-2">
                {transactions.slice(0, 50).map(tx => (
                  <div key={tx.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <span className="text-sm font-bold">{tx.profilkisi?.name || tx.user_id?.slice(0,8)}</span>
                      <span className="text-xs text-zinc-500 ml-2">{tx.type}</span>
                    </div>
                    <span className={`font-black text-sm ${Number(tx.amount) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>₺{Number(tx.amount).toFixed(2)}</span>
                    <span className="text-[10px] text-zinc-600">{new Date(tx.created_at).toLocaleDateString()}</span>
                    {tx.status !== 'refunded'
                      ? <button onClick={() => setRefundModal(tx)} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-red-900/40 text-red-400 rounded-lg font-black">İade</button>
                      : <span className="text-[10px] text-zinc-600 font-black">İade edildi</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BİLDİRİM MERKEZİ ── */}
        {tab === 'notifications' && (
          <div className="space-y-6">
            <form onSubmit={sendAnnouncement} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Yeni Bildirim / Duyuru</h2>
              <div>
                <p className="text-[11px] text-zinc-600 mb-2">Hedef Kitle</p>
                <div className="flex gap-2">
                  {[['all','Tüm Kullanıcılar'],['providers','Hizmet Verenler'],['customers','Müşteriler']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setAnnTarget(v)}
                      className={`px-3 py-2 rounded-lg text-[11px] font-black border ${annTarget===v ? 'bg-emerald-500/20 border-emerald-700 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Başlık" required className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 w-full" />
              <textarea value={annBody} onChange={e => setAnnBody(e.target.value)} placeholder="Mesaj içeriği..." required rows={3} className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 w-full resize-none" />
              <input value={annLink} onChange={e => setAnnLink(e.target.value)} placeholder="Link (opsiyonel, örn: /harita)" className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 w-full" />
              <button type="submit" className="w-full py-3 bg-emerald-500 text-black font-black rounded-xl text-sm">Gönder</button>
            </form>
            <div>
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">Gönderim Geçmişi</h2>
              {announcements.length === 0 ? <p className="text-zinc-600 text-sm">Duyuru yok</p> : (
                <div className="space-y-2">
                  {announcements.map(a => (
                    <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-sm">{a.title}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{a.body}</div>
                          {a.link && <div className="text-[10px] text-emerald-600 mt-0.5">{a.link}</div>}
                        </div>
                        <span className="text-[10px] text-zinc-600 flex-shrink-0">{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-bold mt-2 inline-block">
                        {a.target === 'providers' ? 'Hizmet Verenler' : a.target === 'customers' ? 'Müşteriler' : 'Herkes'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GÜVENLİK RADARI ── */}
        {tab === 'radar' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Güvenlik Radarı — Şüpheli İşlemler</h2>
              <button onClick={loadRadar} className="text-[11px] px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg font-black text-zinc-400 hover:text-white">Yenile</button>
            </div>
            {radarLoading && <p className="text-zinc-600 text-sm">Taranıyor...</p>}
            {!radarLoading && radar.length === 0 && <p className="text-zinc-600 text-sm">Şüpheli işlem bulunamadı.</p>}
            <div className="space-y-2">
              {radar.map((f, i) => (
                <div key={i} className="bg-zinc-900 border border-red-900/30 rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-black text-sm text-red-400">{f.type}</span>
                    <p className="text-xs text-zinc-500">{f.detail}</p>
                    <p className="text-[10px] text-zinc-600">Görev: {f.id?.slice(0,8)}</p>
                  </div>
                  <div className="flex gap-2">
                    {f.sender && <button onClick={() => userAction('ban', f.sender)} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-red-900/50 text-red-400 rounded-lg font-black">Askıya Al</button>}
                    {f.receiver && f.receiver !== f.sender && <button onClick={() => userAction('ban', f.receiver)} className="text-[10px] px-2.5 py-1.5 bg-zinc-800 border border-red-900/50 text-red-400 rounded-lg font-black">Alıcıyı Askıya Al</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BÜYÜME ── */}
        {tab === 'growth' && (
          <div className="space-y-6">
            <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Büyüme — Referans Sistemi</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">Top 10 Davetçi</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={growth.slice(0,10)} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#52525b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#2ECC71" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-3">Tüm Davetçiler</h3>
              {growth.length === 0 ? <p className="text-zinc-600 text-sm">Referans verisi yok</p> : (
                <div className="space-y-2">
                  {growth.map((g, i) => (
                    <div key={g.uid} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
                      <span className="text-zinc-600 font-black text-sm w-6">{i+1}.</span>
                      <span className="font-black text-sm flex-1">{g.name}</span>
                      <span className="text-emerald-400 font-black text-sm">{g.count} davet</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* ── GİRİŞ DENEMELERİ ── */}
        {tab === 'attempts' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Admin Paneli — Hatalı Giriş Denemeleri</h2>
              <button onClick={loadAdminAttempts} className="text-[11px] px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg font-black text-zinc-400 hover:text-white">Yenile</button>
            </div>
            {attemptsLoading && <p className="text-zinc-600 text-sm">Yükleniyor...</p>}
            {!attemptsLoading && adminAttempts.length === 0 && (
              <p className="text-zinc-600 text-sm">Kayıtlı hatalı giriş denemesi yok.</p>
            )}
            <div className="space-y-2">
              {adminAttempts.map((a, i) => (
                <div key={a.id || i} className={`rounded-xl px-4 py-3 flex items-center gap-4 border ${a.success ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <span className={`font-black text-sm ${a.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {a.success ? '✓ Başarılı Giriş' : '✗ Hatalı Deneme'}
                    </span>
                    <p className="text-xs text-zinc-500 font-mono">{a.email}</p>
                    {a.ip_address && <p className="text-[10px] text-zinc-600 font-mono">IP: {a.ip_address}</p>}
                  </div>
                  <span className="text-[10px] text-zinc-600 flex-shrink-0">
                    {new Date(a.attempted_at).toLocaleString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ADRES GEÇMİŞİ ── */}
        {tab === 'address_history' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Adres Değişiklik Arşivi</h2>
              <button onClick={loadAddressHistory} className="text-[11px] px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg font-black text-zinc-400 hover:text-white">Yenile</button>
            </div>
            {addressHistoryLoading && <p className="text-zinc-600 text-sm">Yükleniyor...</p>}
            {!addressHistoryLoading && addressHistory.length === 0 && (
              <p className="text-zinc-600 text-sm">Adres değişiklik kaydı yok.</p>
            )}
            <div className="space-y-3">
              {addressHistory.map((h, i) => {
                const fmt = (addr) => addr ? [addr.address_line1, addr.address_line2, addr.neighborhood, addr.district, addr.city, addr.postal_code, addr.country].filter(Boolean).join(', ') : '—';
                return (
                  <div key={h.id || i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-mono text-zinc-500">{h.user_id?.slice(0, 16)}...</span>
                      <span className="text-[10px] text-zinc-600">{new Date(h.changed_at).toLocaleString('tr-TR')}</span>
                    </div>
                    {h.old_address && (
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-black uppercase text-red-400/70 bg-red-900/20 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">Eski</span>
                        <p className="text-xs text-zinc-500 leading-relaxed">{fmt(h.old_address)}</p>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-black uppercase text-emerald-400/70 bg-emerald-900/20 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">Yeni</span>
                      <p className="text-xs text-zinc-300 leading-relaxed">{fmt(h.new_address)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ADMİN LOGLARI ── */}
        {tab === 'admin_logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Admin Giriş & İşlem Logları</h2>
              <button onClick={loadAdminLogs} className="text-[11px] px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg font-black text-zinc-400 hover:text-white">Yenile</button>
            </div>
            {/* İstatistik özeti */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Başarılı Giriş', val: adminLogs.filter(l => l.event_type === 'login_success').length, color: 'text-emerald-400' },
                { label: 'Hatalı Deneme', val: adminLogs.filter(l => l.event_type === 'login_fail').length, color: 'text-red-400' },
                { label: 'Şifre Değişikliği', val: adminLogs.filter(l => l.event_type === 'password_set').length, color: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-zinc-600 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            {adminLogsLoading && <p className="text-zinc-600 text-sm">Yükleniyor...</p>}
            {!adminLogsLoading && adminLogs.length === 0 && <p className="text-zinc-600 text-sm">Henüz log kaydı yok.</p>}
            <div className="space-y-2">
              {adminLogs.map((l, i) => {
                const cfg = {
                  login_success: { label: '✓ Başarılı Giriş', cls: 'text-emerald-400', bg: 'bg-emerald-900/10 border-emerald-900/30', dot: 'bg-emerald-500' },
                  login_fail:    { label: '✗ Hatalı Deneme', cls: 'text-red-400',     bg: 'bg-red-900/10 border-red-900/30',     dot: 'bg-red-500' },
                  password_set:  { label: '⚡ Şifre Belirlendi', cls: 'text-blue-400',  bg: 'bg-blue-900/10 border-blue-900/30',   dot: 'bg-blue-500' },
                }[l.event_type] || { label: l.event_type, cls: 'text-zinc-400', bg: 'bg-zinc-900 border-zinc-800', dot: 'bg-zinc-500' };
                return (
                  <div key={l.id || i} className={`rounded-xl px-4 py-3 flex items-start gap-4 border ${cfg.bg}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`font-black text-sm ${cfg.cls}`}>{cfg.label}</span>
                      {l.detail && <p className="text-xs text-zinc-500 mt-0.5">{l.detail}</p>}
                      {l.ip_address && <p className="text-[10px] text-zinc-600 font-mono mt-0.5">IP: {l.ip_address}</p>}
                    </div>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0 font-mono">
                      {new Date(l.created_at).toLocaleString('tr-TR')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ÖNERİLER ── */}
        {tab === 'suggestions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Kullanıcı Önerileri ({suggestions.length})</h3>
              <button onClick={loadSuggestions} className="text-xs text-emerald-400 font-bold">Yenile</button>
            </div>
            {suggestions.length === 0 ? (
              <p className="text-zinc-600 text-sm">Henüz öneri yok.</p>
            ) : (
              <div className="space-y-3">
                {suggestions.map(s => (
                  <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-sm text-white">{s.name}</span>
                      <span className="text-[10px] text-zinc-500">{new Date(s.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{s.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
