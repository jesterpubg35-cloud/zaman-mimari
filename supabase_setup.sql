-- Supabase Setup SQL - Tüm tablo ve bucket ayarları

-- 1. Çoklu rol desteği için roles kolonu ekle
ALTER TABLE profilkisi 
ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{}'::text[];

-- 2. Mevcut verileri yeni roles kolonuna taşı
UPDATE profilkisi 
SET roles = ARRAY[role] 
WHERE array_length(roles, 1) IS NULL OR roles IS NULL;

-- 3. Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_profilkisi_roles 
ON profilkisi USING gin(roles);

-- 4. Profil değerlendirmeleri tablosu (eğer yoksa)
CREATE TABLE IF NOT EXISTS profilreviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    target_id uuid REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    reviewer_id uuid REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    request_id uuid,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at timestamptz DEFAULT now()
);

-- 5. Profil değerlendirmeleri için indexler
CREATE INDEX IF NOT EXISTS idx_reviews_target ON profilreviews(target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON profilreviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_request ON profilreviews(request_id);

-- 6. Storage bucket oluştur (eğer yoksa)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage erişim politikaları
-- Public okuma erişimi
CREATE POLICY IF NOT EXISTS "Public Read Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'profile-photos');

-- Authenticated kullanıcılar upload yapabilir
CREATE POLICY IF NOT EXISTS "Authenticated Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
);

-- Kendi dosyalarını güncelleyebilir
CREATE POLICY IF NOT EXISTS "Owner Update" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
