'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const ADMIN_EMAIL = 'uguryigitkarakuzu@gmail.com';
const DONUT_COLORS = ['#2ECC71', '#f59e0b', '#ef4444', '#8b5cf6'];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
  );
}

async function apiFetch(token, type, extra = '') {
  const res = await fetch(`/api/admin/users?type=${type}${extra}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json().catch(() => ({}));
}

async function apiPost(token, body) {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

// ─── Stat Kart ─────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#2ECC71', icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-black text-white/40 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-black" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  );
}

// ─── Sekme butonları ────────────────────────────────────────
function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
        active ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Ana Bileşen ────────────────────────────────────────────
export default function AdminDashboard() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState('dashboard');

  // Dashboard
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Kullanıcılar
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQ, setUserQ] = useState('');

  // Raporlar
  const [reports, setReports] = useState([]);

  // Kanıtlar
  const [proofs, setProofs] = useState([]);
  const [chatModal, setChatModal] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  // Yorumlar
  const [reviews, setReviews] = useState([]);

  // Finansal
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  // Duyurular
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');

  const [toast, setToast] = useState('');
  const realtimeRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Auth kontrolü ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user?.email === ADMIN_EMAIL) {
        setToken(session.access_token);
        setIsAdmin(true);
      }
      setAuthChecked(true);
    })();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginErr('');
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) throw error;
      if (data?.user?.email !== ADMIN_EMAIL) { await sb.auth.signOut(); throw new Error('Admin yetkisi yok.'); }
      setToken(data.session.access_token);
      setIsAdmin(true);
    } catch (e) { setLoginErr(e?.message || 'Hata'); }
    finally { setLoginLoading(false); }
  };

  // ── Realtime ────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin || !token) return;
    const sb = getSupabase();
    const ch = sb.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        loadStats(); 
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profilkisi' }, () => {
        loadUsers();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, () => {
        loadReports();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
        loadStats(); loadTransactions();
      })
      .subscribe();
    realtimeRef.current = ch;
    return () => { sb.removeChannel(ch); };
  }, [isAdmin, token]);

  // ── Veri Yükleyiciler ───────────────────────────────────
  const loadStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    const data = await apiFetch(token, 'stats');
    setStats(data);
    setStatsLoading(false);
  }, [token]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    const data = await apiFetch(token, 'users');
    setUsers(data.users || []);
    setUsersLoading(false);
  }, [token]);

  const loadReports = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch(token, 'reports');
    setReports(data.reports || []);
  }, [token]);

  const loadProofs = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch(token, 'proofs');
    setProofs(data.proofs || []);
  }, [token]);

  const loadReviews = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch(token, 'reviews');
    setReviews(data.reviews || []);
  }, [token]);

  const loadTransactions = useCallback(async () => {
    if (!token) return;
    const [txData, wdData] = await Promise.all([
      apiFetch(token, 'transactions'),
      apiFetch(token, 'withdrawals'),
    ]);
    setTransactions(txData.transactions || []);
    setWithdrawals(wdData.withdrawals || []);
  }, [token]);

  const loadAnnouncements = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch(token, 'announcements');
    setAnnouncements(data.announcements || []);
  }, [token]);

  const loadChat = async (requestId) => {
    const data = await apiFetch(token, 'chat', `&request_id=${requestId}`);
    setChatMessages(data.messages || []);
    setChatModal(requestId);
  };

  // ── Sekme değişince yükle ────────────────────────────────
  useEffect(() => {
    if (!isAdmin || !token) return;
    if (tab === 'dashboard') { loadStats(); }
    if (tab === 'users') { loadUsers(); }
    if (tab === 'disputes') { loadReports(); loadProofs(); }
    if (tab === 'reviews') { loadReviews(); }
    if (tab === 'financial') { loadTransactions(); }
    if (tab === 'announcements') { loadAnnouncements(); }
  }, [tab, isAdmin, token]);

  // ── Aksiyonlar ───────────────────────────────────────────
  const userAction = async (action, targetUserId) => {
    await apiPost(token, { action, targetUserId });
    showToast('İşlem tamam ✓');
    loadUsers();
  };

  const hideReview = async (reviewId) => {
    await apiPost(token, { action: 'hide_review', reviewId });
    showToast('Yorum gizlendi ✓');
    loadReviews();
  };

  const approveWithdrawal = async (withdrawalId) => {
    await apiPost(token, { action: 'approve_withdrawal', withdrawalId });
    showToast('Para çekme onaylandı ✓');
    loadTransactions();
  };

  const sendAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    await apiPost(token, { action: 'send_announcement', title: annTitle, body: annBody });
    setAnnTitle(''); setAnnBody('');
    showToast('Duyuru gönderildi ✓');
    loadAnnouncements();
  };

  // ── Giriş ekranı ─────────────────────────────────────────
  if (!authChecked) return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-white/30 text-sm">Yükleniyor...</div>
    </main>
  );

  if (!isAdmin) return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-4">
        <div className="text-center mb-2">
          <div className="text-3xl font-black text-emerald-400 mb-1">TICK</div>
          <div className="text-white/50 text-sm">Admin Paneli</div>
        </div>
        {loginErr && <div className="text-red-400 text-xs font-bold bg-red-500/10 rounded-xl p-3 text-center">{loginErr}</div>}
        <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="E-posta" required
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" />
        <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Şifre" required
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" />
        <button type="submit" disabled={loginLoading}
          className="py-3 bg-emerald-500 text-black font-black rounded-xl text-sm disabled:opacity-50">
          {loginLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </main>
  );

  // ── Filtreli kullanıcılar ─────────────────────────────────
  const filteredUsers = users.filter(u => {
    const q = userQ.trim().toLowerCase();
    if (!q) return true;
    return [u.name, u.email, u.phone, u.user_id].some(v => v?.toLowerCase().includes(q));
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] bg-emerald-500 text-black font-black px-5 py-3 rounded-2xl shadow-xl text-sm">
          {toast}
        </div>
      )}

      {/* Chat Modal */}
      {chatModal && (
        <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 rounded-3xl border border-white/10 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="font-black text-sm">Sohbet İzleme — {chatModal.slice(0, 8)}...</span>
              <button onClick={() => setChatModal(null)} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(m => (
                <div key={m.id} className="bg-white/5 rounded-xl p-3">
                  <div className="text-[10px] text-white/40 mb-1">{m.sender_id?.slice(0, 8)} · {new Date(m.created_at).toLocaleTimeString()}</div>
                  {m.type === 'image'
                    ? <img src={m.content} alt="" className="max-h-32 rounded-xl" />
                    : <p className="text-sm">{m.content}</p>}
                  {m.metadata?.label && <span className="text-[10px] font-black text-emerald-400">{m.metadata.label === 'teslim_aldim' ? '📥 Teslim Aldım' : '📤 Teslim Ettim'}</span>}
                </div>
              ))}
              {chatMessages.length === 0 && <p className="text-white/30 text-sm text-center">Mesaj yok</p>}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-2xl font-black text-emerald-400">TICK</div>
            <div className="text-xs text-white/40 font-bold uppercase tracking-widest">Admin Paneli</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/40 font-bold">Canlı</span>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Tab active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>📊 Dashboard</Tab>
          <Tab active={tab === 'users'} onClick={() => setTab('users')}>👥 Kullanıcılar</Tab>
          <Tab active={tab === 'disputes'} onClick={() => setTab('disputes')}>🔍 İtiraz & Kanıt</Tab>
          <Tab active={tab === 'reviews'} onClick={() => setTab('reviews')}>⭐ Yorumlar</Tab>
          <Tab active={tab === 'financial'} onClick={() => setTab('financial')}>💰 Finansal</Tab>
          <Tab active={tab === 'announcements'} onClick={() => setTab('announcements')}>📢 Duyurular</Tab>
        </div>

        {/* ── DASHBOARD ─────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div>
            {statsLoading && <p className="text-white/30 text-sm mb-6">Yükleniyor...</p>}
            {stats && (
              <>
                {/* Stat kartları */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <StatCard label="Toplam Kullanıcı" value={stats.totalUsers} icon="👥" />
                  <StatCard label="Aktif İş" value={stats.activeJobs} icon="⚡" color="#f59e0b" />
                  <StatCard label="Tamamlanan İş" value={stats.completedJobs} icon="✅" color="#2ECC71" />
                  <StatCard label="Ort. Tamamlama" value={`${stats.avgMinutes}dk`} icon="⏱️" color="#8b5cf6" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  <StatCard label="Hizmet Verenler" value={stats.seekers} icon="🛵" color="#00cfff" sub="Aktif rol sahibi" />
                  <StatCard label="İş Verenler" value={stats.givers} icon="📋" color="#ff6a00" sub="Müşteri rolü" />
                  <StatCard label="Bekleyen Ödeme" value={`₺${stats.pendingAmount?.toFixed(0)}`} icon="💳" color="#ef4444" sub="Escrow'da bekliyor" />
                </div>

                {/* Grafikler */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Gelir çizgi grafiği */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="font-black text-sm mb-4 text-white/70">📈 Son 14 Günlük Komisyon Geliri</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={stats.revenueChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                        <Line type="monotone" dataKey="amount" stroke="#2ECC71" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* İş durumu donut */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="font-black text-sm mb-4 text-white/70">🍩 İş Durumu Dağılımı</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={stats.donut} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                          {stats.donut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                        </Pie>
                        <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── KULLANICILAR ──────────────────────────────── */}
        {tab === 'users' && (
          <div>
            <div className="flex gap-3 mb-5">
              <input value={userQ} onChange={e => setUserQ(e.target.value)} placeholder="İsim, email, telefon ara..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none text-white placeholder:text-white/30" />
              <button onClick={loadUsers} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/10">🔄</button>
            </div>
            {usersLoading ? <p className="text-white/30 text-sm">Yükleniyor...</p> : (
              <div className="space-y-2">
                {filteredUsers.map(u => (
                  <div key={u.user_id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{u.name || '—'}</span>
                        {u.is_verified && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-black">✓ Doğrulandı</span>}
                        {u.is_banned && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-black">🚫 Banlı</span>}
                      </div>
                      <div className="text-xs text-white/40">{u.email} · {u.phone}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">⭐ {u.average_rating || 0} · ✅ {u.total_completed_jobs || 0} iş · {new Date(u.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {!u.is_verified
                        ? <button onClick={() => userAction('verify', u.user_id)} className="text-[10px] px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg font-black border border-blue-500/20">✓ Mavi Tık</button>
                        : <button onClick={() => userAction('unverify', u.user_id)} className="text-[10px] px-3 py-1.5 bg-white/5 text-white/40 rounded-lg font-black">Tık Kaldır</button>}
                      {!u.is_banned
                        ? <button onClick={() => userAction('ban', u.user_id)} className="text-[10px] px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg font-black border border-red-500/20">🚫 Ban</button>
                        : <button onClick={() => userAction('unban', u.user_id)} className="text-[10px] px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg font-black border border-emerald-500/20">✓ Banı Kaldır</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── İTİRAZ & KANIT ────────────────────────────── */}
        {tab === 'disputes' && (
          <div className="space-y-8">
            {/* Raporlanan kullanıcılar */}
            <div>
              <h2 className="font-black text-sm text-white/60 uppercase tracking-widest mb-4">🚨 Raporlanan Kullanıcılar</h2>
              {reports.length === 0 ? <p className="text-white/30 text-sm">Rapor yok</p> : (
                <div className="space-y-2">
                  {reports.map(r => (
                    <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="font-black text-sm">{r.target?.name || r.target_id?.slice(0, 8)}</span>
                          <span className="text-white/40 text-xs ml-2">← {r.reporter?.name}</span>
                          {r.reason && <p className="text-xs text-white/50 mt-1">{r.reason}</p>}
                        </div>
                        <div className="flex gap-2">
                          {r.request_id && <button onClick={() => loadChat(r.request_id)} className="text-[10px] px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg font-black">💬 Sohbet</button>}
                          <button onClick={() => userAction('ban', r.target_id)} className="text-[10px] px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg font-black">🚫 Ban</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fotoğraf kanıt arşivi */}
            <div>
              <h2 className="font-black text-sm text-white/60 uppercase tracking-widest mb-4">📸 Fotoğraf Kanıt Arşivi</h2>
              {proofs.length === 0 ? <p className="text-white/30 text-sm">Kanıt fotoğrafı yok</p> : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {proofs.map(p => (
                    <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <img src={p.content} alt="" className="w-full h-32 object-cover" />
                      <div className="p-3">
                        {p.metadata?.label && <p className="text-[10px] font-black text-emerald-400">{p.metadata.label === 'teslim_aldim' ? '📥 Teslim Aldım' : '📤 Teslim Ettim'}</p>}
                        {p.metadata?.sent_at && <p className="text-[9px] text-white/30">{new Date(p.metadata.sent_at).toLocaleString()}</p>}
                        {p.metadata?.gps_lat && <p className="text-[9px] text-white/30">📍 {Number(p.metadata.gps_lat).toFixed(4)}, {Number(p.metadata.gps_lng).toFixed(4)}</p>}
                        {p.request_id && <button onClick={() => loadChat(p.request_id)} className="mt-2 text-[10px] px-2 py-1 bg-white/5 rounded-lg text-white/40 font-black w-full">💬 Sohbeti Gör</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── YORUMLAR ──────────────────────────────────── */}
        {tab === 'reviews' && (
          <div>
            <h2 className="font-black text-sm text-white/60 uppercase tracking-widest mb-4">⭐ Yorum Moderasyonu</h2>
            {reviews.length === 0 ? <p className="text-white/30 text-sm">Yorum yok</p> : (
              <div className="space-y-2">
                {reviews.filter(r => !r.hidden).map(r => (
                  <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-yellow-400 text-sm">{'⭐'.repeat(r.rating)}</span>
                        <span className="text-xs text-white/40">{r.target?.name} ← {r.reviewer?.name}</span>
                      </div>
                      {r.comment && <p className="text-sm text-white/70">{r.comment}</p>}
                      <p className="text-[10px] text-white/30 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => hideReview(r.id)} className="text-[10px] px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg font-black flex-shrink-0">Gizle</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FİNANSAL ──────────────────────────────────── */}
        {tab === 'financial' && (
          <div className="space-y-8">
            {/* Para çekme talepleri */}
            <div>
              <h2 className="font-black text-sm text-white/60 uppercase tracking-widest mb-4">💸 Para Çekme Talepleri</h2>
              {withdrawals.length === 0 ? <p className="text-white/30 text-sm">Bekleyen talep yok</p> : (
                <div className="space-y-2">
                  {withdrawals.map(w => (
                    <div key={w.id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-4">
                      <div className="flex-1">
                        <span className="font-black">{w.profilkisi?.name}</span>
                        <span className="text-white/40 text-xs ml-2">{w.profilkisi?.email}</span>
                        <div className="text-emerald-400 font-black text-lg">₺{w.amount}</div>
                        <div className="text-[10px] text-white/30">{w.iban || w.bank_account} · {new Date(w.created_at).toLocaleDateString()}</div>
                      </div>
                      {w.status === 'pending' && (
                        <button onClick={() => approveWithdrawal(w.id)} className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black border border-emerald-500/20">
                          ✓ Onayla
                        </button>
                      )}
                      {w.status === 'approved' && <span className="text-[10px] text-emerald-400 font-black">✓ Onaylı</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Son işlemler */}
            <div>
              <h2 className="font-black text-sm text-white/60 uppercase tracking-widest mb-4">📋 Son İşlemler</h2>
              <div className="space-y-2">
                {transactions.slice(0, 50).map(tx => (
                  <div key={tx.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <span className="text-sm font-bold">{tx.profilkisi?.name || tx.user_id?.slice(0, 8)}</span>
                      <span className="text-xs text-white/40 ml-2">{tx.type}</span>
                    </div>
                    <span className={`font-black text-sm ${Number(tx.amount) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ₺{Number(tx.amount).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-white/30">{new Date(tx.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DUYURULAR ─────────────────────────────────── */}
        {tab === 'announcements' && (
          <div className="space-y-6">
            <form onSubmit={sendAnnouncement} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
              <h2 className="font-black text-sm text-white/60 uppercase tracking-widest mb-2">📢 Yeni Duyuru Gönder</h2>
              <input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Başlık" required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" />
              <textarea value={annBody} onChange={e => setAnnBody(e.target.value)} placeholder="Mesaj içeriği..." required rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 resize-none" />
              <button type="submit" className="w-full py-3 bg-emerald-500 text-black font-black rounded-xl text-sm">📢 Gönder</button>
            </form>

            <div>
              <h2 className="font-black text-sm text-white/60 uppercase tracking-widest mb-4">Geçmiş Duyurular</h2>
              {announcements.length === 0 ? <p className="text-white/30 text-sm">Duyuru yok</p> : (
                <div className="space-y-2">
                  {announcements.map(a => (
                    <div key={a.id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                      <div className="font-black text-sm">{a.title}</div>
                      <div className="text-xs text-white/50 mt-1">{a.body}</div>
                      <div className="text-[10px] text-white/30 mt-1">{new Date(a.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
