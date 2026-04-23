-- Kullanıcılar birbirinin konumunu görebilmeli
-- Locations tablosu RLS policy

-- Önce RLS'i aktif et (eğer değilse)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Eski policy'leri temizle (varsa)
DROP POLICY IF EXISTS "Locations are viewable by everyone" ON locations;
DROP POLICY IF EXISTS "Users can insert their own location" ON locations;
DROP POLICY IF EXISTS "Users can update their own location" ON locations;
DROP POLICY IF EXISTS "Users can view all locations" ON locations;

-- Herkes tüm konumları görebilir
CREATE POLICY "Users can view all locations"
  ON locations FOR SELECT
  USING (true);

-- Herkes kendi konumunu ekleyebilir/güncelleyebilir
CREATE POLICY "Users can upsert their own location"
  ON locations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Profilkisi tablosu için de aynı şekilde
ALTER TABLE profilkisi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profilkisi viewable by everyone" ON profilkisi;
DROP POLICY IF EXISTS "Users can view all profilkisi" ON profilkisi;
DROP POLICY IF EXISTS "Users can update their own profile" ON profilkisi;

-- Herkes tüm profilleri görebilir
CREATE POLICY "Users can view all profilkisi"
  ON profilkisi FOR SELECT
  USING (true);

-- Sadece kendi profilini güncelleyebilir
CREATE POLICY "Users can update their own profilkisi"
  ON profilkisi FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
