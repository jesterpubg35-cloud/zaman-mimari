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

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [users, setUsers] = useState([]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
          },
        }
      );

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

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
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

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

  const toggleExpanded = useCallback((userId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

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

                                  {/* diğer alanlar (varsa) */}
                                  {u?.created_at && (
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="text-xs font-black text-white/40">Oluşturma</div>
                                      <div className="text-sm font-bold text-right">{new Date(u.created_at).toLocaleString()}</div>
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
