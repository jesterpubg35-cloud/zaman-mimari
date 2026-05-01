-- Referral Sistemi - Sadece Tablo Alanları
-- Supabase SQL Editor'da çalıştır
-- NOT: referred_by TEXT olmalı (profilkisi.user_id TEXT ile uyumlu)

ALTER TABLE profilkisi ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE profilkisi ADD COLUMN IF NOT EXISTS referral_qualified BOOLEAN DEFAULT FALSE;
ALTER TABLE profilkisi ADD COLUMN IF NOT EXISTS badge VARCHAR(100);
ALTER TABLE profilkisi ADD COLUMN IF NOT EXISTS referral_free_jobs INTEGER DEFAULT 1;

-- İndeks ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_referred_by ON profilkisi(referred_by) WHERE referred_by IS NOT NULL;
