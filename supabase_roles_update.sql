-- Supabase Roles Update SQL
-- Bu SQL komutlarını Supabase Dashboard -> SQL Editor'de çalıştırın

-- 1. roles array kolonu ekle (çoklu rol desteği için)
ALTER TABLE profilkisi ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{};

-- 2. Mevcut role değerlerini roles array'ine taşı
UPDATE profilkisi 
SET roles = ARRAY[role] 
WHERE roles = '{}' OR roles IS NULL;

-- 3. roles için index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_profilkisi_roles ON profilkisi USING gin(roles);

-- 4. Rol bazlı marker renkleri için yeni kolon (opsiyonel, kod içinde de yapılabilir)
-- Eğer her rol için özel renk tanımlamak isterseniz bu tabloyu kullanabilirsiniz

-- 5. Profil reviews tablosunu kontrol et (eğer yoksa oluştur)
CREATE TABLE IF NOT EXISTS profilreviews (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    target_id uuid REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    reviewer_id uuid REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    request_id uuid,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Reviews için indexler
CREATE INDEX IF NOT EXISTS idx_reviews_target ON profilreviews(target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON profilreviews(reviewer_id);

-- 7. Storage bucket oluştur (eğer daha önce oluşturulmadıysa)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 8. Storage policies
-- Public erişim politikası
CREATE POLICY IF NOT EXISTS "Public Access" 
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Authenticated kullanıcılar upload yapabilir
CREATE POLICY IF NOT EXISTS "Allow Uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

-- Kendi dosyalarını silebilirler
CREATE POLICY IF NOT EXISTS "Allow Deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
