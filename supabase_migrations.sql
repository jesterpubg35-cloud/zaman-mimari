-- ══════════════════════════════════════════════════════════════
-- TICK Platform — Güvenlik & Doğrulama Altyapısı Güncellemesi
-- Supabase SQL Editor'da SIRAYLA çalıştır
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
  change_type   text NOT NULL DEFAULT 'update'
);

CREATE INDEX IF NOT EXISTS idx_address_history_user_id ON address_history(user_id);
CREATE INDEX IF NOT EXISTS idx_address_history_changed_at ON address_history(changed_at DESC);

ALTER TABLE address_history ENABLE ROW LEVEL SECURITY;
-- Policy zaten varsa sil, yeniden oluştur
DROP POLICY IF EXISTS "Service role only" ON address_history;
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

ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only" ON admin_login_attempts;
CREATE POLICY "Service role only" ON admin_login_attempts
  USING (auth.role() = 'service_role');

-- 4. admin_settings tablosu — admin şifresi ve sistem ayarları
CREATE TABLE IF NOT EXISTS admin_settings (
  key           text PRIMARY KEY,
  value         text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only" ON admin_settings;
CREATE POLICY "Service role only" ON admin_settings
  USING (auth.role() = 'service_role');

-- 5. admin_logs tablosu — giriş ve işlem logları
CREATE TABLE IF NOT EXISTS admin_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text NOT NULL, -- 'login_success' | 'login_fail' | 'password_set'
  ip_address    text,
  user_agent    text,
  detail        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_event_type ON admin_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only" ON admin_logs;
CREATE POLICY "Service role only" ON admin_logs
  USING (auth.role() = 'service_role');

-- 6. Mevcut doğrulanmış kullanıcıları senkronize et
UPDATE profilkisi p
SET email_verified = true
FROM auth.users a
WHERE p.user_id = a.id::text
  AND a.email_confirmed_at IS NOT NULL;
