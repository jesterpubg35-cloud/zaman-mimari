'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileDown, Search, RefreshCw, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
};

function normalizeRolesValue(val) {
  if (!val) return null;
  if (Array.isArray(val)) {
    const filtered = val.filter(Boolean);
    return filtered.length > 0 ? filtered : null;
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(Boolean);
        return filtered.length > 0 ? filtered : null;
      }
    } catch {}
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  return null;
}

function getGroupKey(u) {
  const roles = normalizeRolesValue(u?.roles) || (u?.role ? [u.role] : ['musteri']);
  const primary = roles.includes('hepsi') ? 'hepsi' : (roles.find(r => r && r !== 'musteri') || 'musteri');
  return primary;
}

function getDisplayAddress(u) {
  const parts = [
    u?.address_line1,
    u?.address_line2,
    u?.neighborhood,
    u?.district,
    u?.city,
    u?.postal_code,
  ].filter(Boolean);
  return parts.join(', ');
}

function safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

const ADMIN_EMAIL = 'uguryigitkarakuzu@gmail.com';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [users, setUsers] = useState([]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [q, setQ] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [locationHistory, setLocationHistory] = useState({}); // { userId: [...] }
  const [locationLoading, setLocationLoading] = useState({});  // { userId: bool }

  const getSupabase = useCallback(async () => {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
    );
  }, []);

  // İlk yüklemede oturum kontrolü
  useEffect(() => {
    (async () => {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      }
      setAuthChecked(true);
    })();
  }, [getSupabase]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginErr('');
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) throw error;
      if (data?.user?.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        throw new Error('Bu hesabın admin yetkisi yok.');
      }
      setIsAdmin(true);
    } catch (e) {
      setLoginErr(e?.message || 'Giriş başarısız');
    } finally {
      setLoginLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const supabase = await getSupabase();
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      if (sessionData?.session?.user?.email !== ADMIN_EMAIL) throw new Error('Unauthorized');

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Unauthorized');

      const res = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Load error');
      }

      setUsers(Array.isArray(json?.users) ? json.users : []);
    } catch (e) {
      setErr(e?.message || 'Load error');
    } finally {
      setLoading(false);
    }
  }, [getSupabase]);

  useEffect(() => {
    if (!isAdmin) return;
    const id = setTimeout(() => load(), 0);
    return () => clearTimeout(id);
  }, [load, isAdmin]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return users;
    return users.filter(u => {
      const roles = normalizeRolesValue(u?.roles) || (u?.role ? [u.role] : []);
      return (
        safeStr(u?.name).toLowerCase().includes(qq) ||
        safeStr(u?.email).toLowerCase().includes(qq) ||
        safeStr(u?.phone).toLowerCase().includes(qq) ||
        safeStr(u?.user_id).toLowerCase().includes(qq) ||
        safeStr(u?.ip_address).toLowerCase().includes(qq) ||
        roles.join(',').toLowerCase().includes(qq)
      );
    });
  }, [users, q]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const u of filtered) {
      const key = getGroupKey(u);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(u);
    }
    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, 'tr'));
    return keys.map(k => ({
      key: k,
      users: map
        .get(k)
        .slice()
        .sort((a, b) => safeStr(a?.name).localeCompare(safeStr(b?.name), 'tr')),
    }));
  }, [filtered]);

  const toggleExpanded = useCallback(async (userId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    // Konum geçmişini henüz çekmediyse çek
    if (!locationHistory[userId] && !locationLoading[userId]) {
      setLocationLoading(prev => ({ ...prev, [userId]: true }));
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const res = await fetch(`/api/admin/users?type=location_history&user_id=${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const json = await res.json().catch(() => ({}));
          setLocationHistory(prev => ({ ...prev, [userId]: json?.history || [] }));
        }
      } catch {}
      setLocationLoading(prev => ({ ...prev, [userId]: false }));
    }
  }, [locationHistory, locationLoading, getSupabase]);

  const exportXlsx = useCallback(() => {
    const rows = filtered.map(u => ({
      'Ad Soyad': u?.name || '',
      'Telefon': u?.phone || '',
      'IP Adresi': u?.ip_address || '',
      'E-posta': u?.email || '',
      'Ev Adresi': getDisplayAddress(u),
      'Rol': u?.role || '',
      'Roller': (normalizeRolesValue(u?.roles) || []).join(', '),
      'User ID': u?.user_id || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kullanicilar');
    XLSX.writeFile(wb, `kullanicilar-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [filtered]);

  const exportPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Letterhead
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, pageW, 78, 'F');
    doc.setTextColor(46, 204, 113);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('TICK', 40, 52);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Kullanıcı Raporu', 110, 52);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Tarih: ${new Date().toLocaleString()}`, 40, 110);

    // Table header
    let y = 140;
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(245, 245, 245);
    doc.rect(40, y, pageW - 80, 22, 'FD');
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(10);
    doc.text('Ad Soyad', 48, y + 15);
    doc.text('Telefon', 210, y + 15);
    doc.text('E-posta', 320, y + 15);
    doc.text('Rol', pageW - 120, y + 15);

    y += 30;

    doc.setFont('helvetica', 'normal');
    for (const u of filtered) {
      if (y > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage();
        y = 60;
      }
      const name = safeStr(u?.name).slice(0, 28);
      const phone = safeStr(u?.phone).slice(0, 16);
      const email = safeStr(u?.email).slice(0, 26);
      const role = safeStr(getGroupKey(u)).slice(0, 12);

      doc.setDrawColor(235, 235, 235);
      doc.line(40, y + 12, pageW - 40, y + 12);
      doc.text(name, 48, y);
      doc.text(phone, 210, y);
      doc.text(email, 320, y);
      doc.text(role, pageW - 120, y);
      y += 22;
    }

    doc.save(`kullanicilar-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [filtered]);

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white/40 text-sm font-bold">Yükleniyor...</div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-4">
          <div className="text-center mb-2">
            <div className="text-2xl font-black text-emerald-400 mb-1">TICK</div>
            <div className="text-white/60 text-sm">Admin Paneli</div>
          </div>
          {loginErr && <div className="text-red-400 text-xs font-bold text-center bg-red-500/10 rounded-xl p-3">{loginErr}</div>}
          <input
            type="email"
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
            placeholder="E-posta"
            required
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
          />
          <input
            type="password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            placeholder="Şifre"
            required
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
          />
          <button
            type="submit"
            disabled={loginLoading}
            className="py-3 bg-emerald-500 text-black font-black rounded-xl text-sm disabled:opacity-50"
          >
            {loginLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-white">
      <motion.div variants={fadeSlide} initial="initial" animate="animate" className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-2 shadow-sm">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">Kullanıcılar</h1>
            </div>
            <p className="mt-2 text-sm text-white/60">Gruplara göre kategorize, alfabetik sıralı liste. Satıra tıklayıp detayları aç.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportPdf()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold shadow-sm hover:bg-white/10 transition"
            >
              <FileDown className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={() => exportXlsx()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold shadow-sm hover:bg-white/10 transition"
            >
              <FileDown className="h-4 w-4" />
              XLSX
            </button>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold shadow-sm hover:bg-white/10 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Yenile
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 shadow-sm">
          <Search className="h-4 w-4 text-white/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsim, e-posta, telefon, rol, IP..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
          />
          <div className="text-xs font-bold text-white/40">{filtered.length}</div>
        </div>

        {err && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
            {err}
          </div>
        )}

        {loading ? (
          <div className="mt-10 text-sm font-bold text-white/50">Yükleniyor...</div>
        ) : (
          <div className="mt-8 space-y-6">
            {grouped.map(group => (
              <section key={group.key} className="rounded-lg border border-white/10 bg-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(46,204,113,0.4)]" />
                    <h2 className="font-black uppercase tracking-widest text-xs text-white/80">{group.key}</h2>
                  </div>
                  <div className="text-xs font-bold text-white/40">{group.users.length}</div>
                </div>

                <div className="divide-y divide-white/10">
                  {group.users.map(u => {
                    const userId = u.user_id || u.id;
                    const isOpen = expanded.has(userId);
                    const roles = normalizeRolesValue(u?.roles) || (u?.role ? [u.role] : ['musteri']);
                    const address = getDisplayAddress(u);

                    return (
                      <div key={userId} className="px-5">
                        <button
                          onClick={() => toggleExpanded(userId)}
                          className="w-full py-4 flex items-center justify-between gap-4 text-left"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-emerald-400/15 border border-emerald-400/20 flex items-center justify-center font-black text-emerald-200">
                                {safeStr(u?.name || '?').trim().slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-black truncate">{u?.name || '—'}</div>
                                <div className="text-xs text-white/50 truncate">{u?.email || '—'}</div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] font-black px-2 py-1 rounded-lg border border-white/10 bg-white/5">{u?.phone || '—'}</span>
                            <span className="text-[11px] font-black px-2 py-1 rounded-lg border border-white/10 bg-white/5">{roles.includes('hepsi') ? 'hepsi' : (u?.role || roles[0] || 'musteri')}</span>
                            <span className={`text-xs font-black transition ${isOpen ? 'text-emerald-300' : 'text-white/40'}`}>{isOpen ? '−' : '+'}</span>
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              variants={fadeSlide}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              className="pb-5"
                            >
                              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                <div className="grid gap-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-xs font-black text-white/40">Ad Soyad</div>
                                    <div className="text-sm font-bold text-right">{u?.name || '—'}</div>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-xs font-black text-white/40">Telefon</div>
                                    <div className="text-sm font-bold text-right">{u?.phone || '—'}</div>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-xs font-black text-white/40">IP Adresi</div>
                                    <div className="text-sm font-bold text-right">{u?.ip_address || '—'}</div>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-xs font-black text-white/40">E-posta</div>
                                    <div className="text-sm font-bold text-right break-all">{u?.email || '—'}</div>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-xs font-black text-white/40">Ev Adresi</div>
                                    <div className="text-sm font-bold text-right break-words">{address || '—'}</div>
                                  </div>

                                  <div className="h-px bg-white/10 my-1" />

                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-xs font-black text-white/40">Roller</div>
                                    <div className="text-sm font-bold text-right">{roles.join(', ')}</div>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-xs font-black text-white/40">User ID</div>
                                    <div className="text-xs font-mono text-right text-white/60 break-all">{userId}</div>
                                  </div>

                                  {u?.birth_date && (
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="text-xs font-black text-white/40">Doğum Tarihi</div>
                                      <div className="text-sm font-bold text-right">{u.birth_date}</div>
                                    </div>
                                  )}
                                  {u?.registered_ip && (
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="text-xs font-black text-white/40">Kayıt IP</div>
                                      <div className="text-sm font-bold text-right font-mono">{u.registered_ip}</div>
                                    </div>
                                  )}
                                  {u?.country && (
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="text-xs font-black text-white/40">Ülke</div>
                                      <div className="text-sm font-bold text-right">{u.country}</div>
                                    </div>
                                  )}
                                  {/* diğer alanlar (varsa) */}
                                  {u?.created_at && (
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="text-xs font-black text-white/40">Oluşturma</div>
                                      <div className="text-sm font-bold text-right">{new Date(u.created_at).toLocaleString()}</div>
                                    </div>
                                  )}

                                  {/* Konum Geçmişi */}
                                  <div className="h-px bg-white/10 my-1" />
                                  <div className="text-xs font-black text-white/40 mb-2">Konum Geçmişi</div>
                                  {locationLoading[userId] ? (
                                    <div className="text-xs text-white/40">Yükleniyor...</div>
                                  ) : (locationHistory[userId] || []).length === 0 ? (
                                    <div className="text-xs text-white/30">Konum kaydı yok</div>
                                  ) : (
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                      {(locationHistory[userId] || []).map((loc, i) => (
                                        <div key={i} className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-white/5">
                                          <span className="font-mono text-white/60">{loc.lat?.toFixed(5)}, {loc.lng?.toFixed(5)}</span>
                                          <span className="text-white/30 flex-shrink-0">{new Date(loc.recorded_at).toLocaleString('tr-TR')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </motion.div>
    </main>
  );
}
