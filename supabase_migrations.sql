-- ══════════════════════════════════════════════════════════════
-- TICK Platform — Güvenlik & Doğrulama Altyapısı Güncellemesi
-- Supabase SQL Editor'da bir kez çalıştır
-- ══════════════════════════════════════════════════════════════

-- 1. profilkisi tablosuna email_verified kalıcılık sütunu ekle
ALTER TABLE profilkisi
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- 2. address_history tablosu — adres değişiklik arşivi
CREATE TABLE IF NOT EXISTS address_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  old_address   jsonb,
  new_address   jsonb NOT NULL,
  changed_at    timestamptz NOT NULL DEFAULT now(),
  change_type   text NOT NULL DEFAULT 'update' -- 'initial' | 'update'
);

-- address_history için index
CREATE INDEX IF NOT EXISTS idx_address_history_user_id ON address_history(user_id);
CREATE INDEX IF NOT EXISTS idx_address_history_changed_at ON address_history(changed_at DESC);

-- RLS: sadece service_role okuyabilir (admin)
ALTER TABLE address_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON address_history
  USING (auth.role() = 'service_role');

-- 3. admin_login_attempts tablosu — hatalı giriş takibi
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  ip_address    text,
  attempted_at  timestamptz NOT NULL DEFAULT now(),
  success       boolean NOT NULL DEFAULT false,
  user_agent    text
);

CREATE INDEX IF NOT EXISTS idx_admin_attempts_email ON admin_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_admin_attempts_at ON admin_login_attempts(attempted_at DESC);

-- RLS: sadece service_role
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON admin_login_attempts
  USING (auth.role() = 'service_role');

-- 4. Mevcut doğrulanmış kullanıcıları güncelle (Supabase auth'tan senkronize et)
-- Bu sorgu auth.users tablosundaki email_confirmed_at değerini profilkisi'ye yansıtır
UPDATE profilkisi p
SET email_verified = true
FROM auth.users a
WHERE p.user_id = a.id::text
  AND a.email_confirmed_at IS NOT NULL;
