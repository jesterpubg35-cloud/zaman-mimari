-- ============================================================
-- TAM GÜVENLİK - TÜM TABLOLAR İÇİN RLS POLİTİKALARI
-- Supabase > SQL Editor'da çalıştır
-- ============================================================

-- ─── 1. TRANSACTIONS (Para işlemleri) ───────────────────────
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role insert transactions" ON transactions;
DROP POLICY IF EXISTS "No update transactions" ON transactions;
DROP POLICY IF EXISTS "No delete transactions" ON transactions;

-- Sadece kendi işlemlerini görebilir
CREATE POLICY "Users read own transactions"
ON transactions FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Insert sadece service_role yapabilir (API üzerinden)
CREATE POLICY "Service role insert transactions"
ON transactions FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

-- Hiç kimse güncelleme/silme yapamaz
CREATE POLICY "No update transactions"
ON transactions FOR UPDATE
USING (false);

CREATE POLICY "No delete transactions"
ON transactions FOR DELETE
USING (false);

-- ─── 2. WALLET_BALANCES (Bakiyeler) ─────────────────────────
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own balance" ON wallet_balances;
DROP POLICY IF EXISTS "No direct balance update" ON wallet_balances;
DROP POLICY IF EXISTS "No direct balance delete" ON wallet_balances;

-- Sadece kendi bakiyeni görebilirsin
CREATE POLICY "Users read own balance"
ON wallet_balances FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Direkt update/delete yasak (sadece API/service_role yapabilir)
CREATE POLICY "No direct balance update"
ON wallet_balances FOR UPDATE
USING (false);

CREATE POLICY "No direct balance delete"
ON wallet_balances FOR DELETE
USING (false);

-- ─── 3. REQUESTS (İş talepleri) ─────────────────────────────
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own requests" ON requests;
DROP POLICY IF EXISTS "Users insert own requests" ON requests;
DROP POLICY IF EXISTS "Users update own requests" ON requests;
DROP POLICY IF EXISTS "No delete requests" ON requests;

-- Sadece sender veya receiver görebilir
CREATE POLICY "Users read own requests"
ON requests FOR SELECT
USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);

-- Sadece giriş yapmış kullanıcı kendi adına talep gönderebilir
CREATE POLICY "Users insert own requests"
ON requests FOR INSERT
WITH CHECK (auth.uid()::text = sender_id::text);

-- Sadece taraflardan biri güncelleyebilir
CREATE POLICY "Users update own requests"
ON requests FOR UPDATE
USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);

-- Kimse silemez
CREATE POLICY "No delete requests"
ON requests FOR DELETE
USING (false);

-- ─── 4. MESSAGES (Mesajlar) ─────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read job messages" ON messages;
DROP POLICY IF EXISTS "Users insert own messages" ON messages;
DROP POLICY IF EXISTS "No update messages" ON messages;
DROP POLICY IF EXISTS "No delete messages" ON messages;

-- İlgili job'ın tarafları mesajları görebilir
CREATE POLICY "Users read job messages"
ON messages FOR SELECT
USING (
  auth.uid()::text IN (
    SELECT sender_id::text FROM requests WHERE id = messages.request_id
    UNION
    SELECT receiver_id::text FROM requests WHERE id = messages.request_id
  )
);

-- Sadece kendi mesajını gönderebilir
CREATE POLICY "Users insert own messages"
ON messages FOR INSERT
WITH CHECK (auth.uid()::text = sender_id::text);

-- Mesaj değiştirilemez/silinemez
CREATE POLICY "No update messages"
ON messages FOR UPDATE
USING (false);

CREATE POLICY "No delete messages"
ON messages FOR DELETE
USING (false);

-- ─── 5. PROFILREVIEWS (Değerlendirmeler) ────────────────────
ALTER TABLE profilreviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone read reviews" ON profilreviews;
DROP POLICY IF EXISTS "Users insert own review" ON profilreviews;
DROP POLICY IF EXISTS "No update reviews" ON profilreviews;
DROP POLICY IF EXISTS "No delete reviews" ON profilreviews;

-- Herkes değerlendirmeleri görebilir
CREATE POLICY "Anyone read reviews"
ON profilreviews FOR SELECT
USING (true);

-- Sadece kendi değerlendirmeni ekleyebilirsin
CREATE POLICY "Users insert own review"
ON profilreviews FOR INSERT
WITH CHECK (auth.uid()::text = reviewer_id::text);

-- Değerlendirme değiştirilemez/silinemez
CREATE POLICY "No update reviews"
ON profilreviews FOR UPDATE
USING (false);

CREATE POLICY "No delete reviews"
ON profilreviews FOR DELETE
USING (false);

-- ─── 6. BLOCKS (Engelleme) ──────────────────────────────────
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own blocks" ON blocks;
DROP POLICY IF EXISTS "Users insert own blocks" ON blocks;
DROP POLICY IF EXISTS "Users delete own blocks" ON blocks;

CREATE POLICY "Users read own blocks"
ON blocks FOR SELECT
USING (auth.uid()::text = blocker_id::text OR auth.uid()::text = blocked_id::text);

CREATE POLICY "Users insert own blocks"
ON blocks FOR INSERT
WITH CHECK (auth.uid()::text = blocker_id::text);

CREATE POLICY "Users delete own blocks"
ON blocks FOR DELETE
USING (auth.uid()::text = blocker_id::text);
