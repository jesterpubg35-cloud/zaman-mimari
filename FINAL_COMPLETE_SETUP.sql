-- =====================================================
-- TICK PLATFORM - TÜM SQL KODLARI BİRLEŞİK
-- Tarih: 29.04.2026
-- Bu dosya: Tüm tablolar, fonksiyonlar, triggerlar ve RLS politikaları
-- Sıralama: Bağımsız olanlar önce, bağımlı olanlar sonra
-- =====================================================

-- =====================================================
-- 1. TEMEL TABLOLAR (Diğer tablolar bunlara bağımlı)
-- =====================================================

-- Profilkisi tablosu (Ana kullanıcı tablosu) - Eğer yoksa oluştur
CREATE TABLE IF NOT EXISTS profilkisi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    name TEXT,
    phone TEXT,
    birth_date DATE,
    role TEXT DEFAULT 'musteri',
    roles TEXT[] DEFAULT '{}',
    avatar_url TEXT,
    bio TEXT,
    is_available BOOLEAN DEFAULT true,
    service_radius INTEGER DEFAULT 10000,
    rating INTEGER,
    average_rating NUMERIC,
    total_completed_jobs INTEGER DEFAULT 0,
    is_admin BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    banned_at TIMESTAMP WITH TIME ZONE,
    banned_reason TEXT,
    is_verified BOOLEAN DEFAULT false,
    stripe_account_id TEXT,
    stripe_customer_id TEXT,
    wallet_balance NUMERIC DEFAULT 0,
    ip_address TEXT,
    registered_ip TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    district TEXT,
    neighborhood TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'TR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TEMİZ KURULUM - Trigger ve Fonksiyonları sil
-- =====================================================
-- Önce trigger'ları sil (fonksiyonlara bağımlı oldukları için)
DROP TRIGGER IF EXISTS trg_check_fast_completion ON requests;
DROP TRIGGER IF EXISTS trg_check_user_rating ON profilreviews;

-- Eski fonksiyonları sil (imza uyumsuzlukları için)
DROP FUNCTION IF EXISTS report_chat_violation(TEXT, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS report_chat_violation(UUID, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS atomic_escrow_hold(TEXT, TEXT, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS atomic_escrow_hold(TEXT, UUID, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS atomic_card_escrow_hold(TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS atomic_card_escrow_hold(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS atomic_escrow_refund(UUID);
DROP FUNCTION IF EXISTS process_security_payment(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS activate_referral(TEXT);
DROP FUNCTION IF EXISTS check_fast_completion();
DROP FUNCTION IF EXISTS check_user_rating();

-- Requests tablosu (İş talepleri)
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    receiver_id TEXT REFERENCES profilkisi(user_id) ON DELETE SET NULL,
    title TEXT,
    description TEXT,
    price NUMERIC,
    status TEXT DEFAULT 'pending',
    active_job BOOLEAN DEFAULT false,
    delivery_code TEXT,
    sender_confirmed BOOLEAN DEFAULT false,
    receiver_confirmed BOOLEAN DEFAULT false,
    sender_completed BOOLEAN DEFAULT false,
    receiver_completed BOOLEAN DEFAULT false,
    payment_status TEXT DEFAULT 'pending',
    -- Güvenlik radarı kolonları
    accepted_at TIMESTAMP WITH TIME ZONE,
    security_hold BOOLEAN DEFAULT false,
    security_cleared_at TIMESTAMP WITH TIME ZONE,
    security_cleared_by TEXT,
    completed_duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Messages tablosu (Sohbet mesajları)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    content TEXT,
    type TEXT DEFAULT 'text',
    metadata JSONB,
    -- Güvenlik kolonları
    has_violation BOOLEAN DEFAULT false,
    violation_type TEXT,
    violation_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 2. GÜVENLİK RADAR TABLOSU
-- =====================================================

CREATE TABLE IF NOT EXISTS security_radar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    details TEXT,
    reporter_id TEXT,
    reported_id TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    admin_notes TEXT,
    payment_hold BOOLEAN DEFAULT false,
    payment_released_at TIMESTAMP WITH TIME ZONE,
    payment_released_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Security radar indexleri
CREATE INDEX IF NOT EXISTS idx_security_radar_request ON security_radar(request_id);
CREATE INDEX IF NOT EXISTS idx_security_radar_status ON security_radar(status);
CREATE INDEX IF NOT EXISTS idx_security_radar_type ON security_radar(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_radar_created ON security_radar(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_radar_payment_hold ON security_radar(payment_hold) WHERE payment_hold = true;

-- =====================================================
-- 3. ADMIN VE YARDIMCI TABLOLAR
-- =====================================================

-- Admin logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT,
    detail TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin login attempts
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    success BOOLEAN DEFAULT false
);

-- Reports (Şikayetler) - Önce sil (tip uyuşmazlığı varsa)
DROP TABLE IF EXISTS reports CASCADE;

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id TEXT REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    target_id TEXT REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    reason TEXT,
    details TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Profil reviews (Değerlendirmeler) - Önce sil (tip uyuşmazlığı varsa)
DROP TABLE IF EXISTS profilreviews CASCADE;

CREATE TABLE profilreviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id TEXT REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    reviewer_id TEXT REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- EKSİK TABLOLAR (Admin panel için gerekli)
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    iban TEXT,
    bank_account TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT,
    target TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS address_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    old_address TEXT,
    new_address TEXT,
    change_type TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Suggestions (Öneriler)
CREATE TABLE IF NOT EXISTS suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Referrals (Referans sistemi)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id TEXT REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    referred_id TEXT REFERENCES profilkisi(user_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    reward_given BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 4. INDEXLER
-- =====================================================

-- Profilkisi indexleri
CREATE INDEX IF NOT EXISTS idx_profilkisi_user_id ON profilkisi(user_id);
CREATE INDEX IF NOT EXISTS idx_profilkisi_email ON profilkisi(email);
CREATE INDEX IF NOT EXISTS idx_profilkisi_roles ON profilkisi USING gin(roles);
CREATE INDEX IF NOT EXISTS idx_profilkisi_banned ON profilkisi(is_banned) WHERE is_banned = true;

-- Requests indexleri
CREATE INDEX IF NOT EXISTS idx_requests_sender ON requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_requests_receiver ON requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_active ON requests(active_job) WHERE active_job = true;
CREATE INDEX IF NOT EXISTS idx_requests_security_hold ON requests(security_hold) WHERE security_hold = true;

-- Messages indexleri
CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_violation ON messages(has_violation) WHERE has_violation = true;

-- Diğer indexler
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_request ON transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_escrow_request ON escrow_holds(request_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON profilreviews(target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON profilreviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

-- =====================================================
-- 5. RLS POLICIES (Row Level Security)
-- =====================================================

-- Profilkisi RLS
ALTER TABLE profilkisi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profilkisi;
CREATE POLICY "Public profiles are viewable by everyone"
ON profilkisi FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profilkisi;
CREATE POLICY "Users can update own profile"
ON profilkisi FOR UPDATE
USING (auth.uid()::text = user_id);

-- Requests RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own requests" ON requests;
CREATE POLICY "Users can view own requests"
ON requests FOR SELECT
USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

DROP POLICY IF EXISTS "Users can insert own requests" ON requests;
CREATE POLICY "Users can insert own requests"
ON requests FOR INSERT
WITH CHECK (auth.uid()::text = sender_id);

DROP POLICY IF EXISTS "Users can update own requests" ON requests;
CREATE POLICY "Users can update own requests"
ON requests FOR UPDATE
USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their requests" ON messages;
CREATE POLICY "Users can view messages in their requests"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM requests 
        WHERE requests.id = messages.request_id 
        AND (requests.sender_id = auth.uid()::text OR requests.receiver_id = auth.uid()::text)
    )
);

DROP POLICY IF EXISTS "Users can insert messages in their requests" ON messages;
CREATE POLICY "Users can insert messages in their requests"
ON messages FOR INSERT
WITH CHECK (
    auth.uid()::text = sender_id AND
    EXISTS (
        SELECT 1 FROM requests 
        WHERE requests.id = messages.request_id 
        AND (requests.sender_id = auth.uid()::text OR requests.receiver_id = auth.uid()::text)
    )
);

-- Security Radar RLS (Sadece admin)
ALTER TABLE security_radar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on security_radar" ON security_radar;
CREATE POLICY "Admin full access on security_radar"
ON security_radar FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profilkisi 
        WHERE user_id = auth.uid()::text 
        AND (roles @> ARRAY['admin'] OR role = 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profilkisi 
        WHERE user_id = auth.uid()::text 
        AND (roles @> ARRAY['admin'] OR role = 'admin')
    )
);

-- Reviews RLS
ALTER TABLE profilreviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone read reviews" ON profilreviews;
CREATE POLICY "Anyone read reviews"
ON profilreviews FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users insert own review" ON profilreviews;
CREATE POLICY "Users insert own review"
ON profilreviews FOR INSERT
WITH CHECK (auth.uid()::text = reviewer_id);

-- Reports RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports"
ON reports FOR SELECT
USING (auth.uid()::text = reporter_id);

DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports"
ON reports FOR INSERT
WITH CHECK (auth.uid()::text = reporter_id);

-- Admin-only tablolar (service_role bypass eder, RLS yine de açalım)
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. FONKSİYONLAR
-- =====================================================

-- updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_profilkisi_updated_at ON profilkisi;
CREATE TRIGGER update_profilkisi_updated_at
BEFORE UPDATE ON profilkisi
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
BEFORE UPDATE ON requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_security_radar_updated_at ON security_radar;
CREATE TRIGGER update_security_radar_updated_at
BEFORE UPDATE ON security_radar
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- HIZLI İŞ TESPİTİ (3 dk altı) - Trigger
CREATE OR REPLACE FUNCTION check_fast_completion()
RETURNS TRIGGER AS $$
DECLARE
    duration_minutes INTEGER;
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        IF NEW.accepted_at IS NOT NULL THEN
            duration_minutes := EXTRACT(EPOCH FROM (NEW.updated_at - NEW.accepted_at)) / 60;
            NEW.completed_duration_minutes := duration_minutes;
            
            IF duration_minutes < 3 THEN
                NEW.security_hold := true;
                
                INSERT INTO security_radar (
                    request_id, alert_type, severity, details, payment_hold, status
                ) VALUES (
                    NEW.id, 
                    'fast_completion',
                    CASE 
                        WHEN duration_minutes < 1 THEN 'critical'
                        WHEN duration_minutes < 2 THEN 'high'
                        ELSE 'medium'
                    END,
                    'Is ' || duration_minutes || ' dakikada tamamlandi',
                    true, 
                    'open'
                );
                
                INSERT INTO admin_logs (event_type, detail, ip_address)
                VALUES ('security_alert', 
                    'Request #' || NEW.id || ' - Supheli hizli tamamlanma: ' || duration_minutes || ' dk', 
                    'system');
            END IF;
        END IF;
    END IF;
    
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        NEW.accepted_at := COALESCE(NEW.accepted_at, now());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_fast_completion ON requests;
CREATE TRIGGER trg_check_fast_completion
BEFORE UPDATE ON requests
FOR EACH ROW EXECUTE FUNCTION check_fast_completion();

-- SOHBET IHLALI BILDIR
CREATE OR REPLACE FUNCTION report_chat_violation(
    p_request_id UUID,
    p_message_id UUID,
    p_reporter_id TEXT,
    p_reported_id TEXT,
    p_violation_type TEXT,
    p_details TEXT
)
RETURNS UUID AS $$
DECLARE
    v_radar_id UUID;
BEGIN
    INSERT INTO security_radar (
        request_id, alert_type, severity, reporter_id, reported_id, details, status
    ) VALUES (
        p_request_id, 
        'chat_violation',
        CASE p_violation_type 
            WHEN 'off_platform_payment' THEN 'high'
            WHEN 'contact_sharing' THEN 'medium'
            ELSE 'medium'
        END,
        p_reporter_id, 
        p_reported_id, 
        p_details, 
        'open'
    )
    RETURNING id INTO v_radar_id;
    
    UPDATE messages 
    SET has_violation = true, 
        violation_type = p_violation_type, 
        violation_details = p_details
    WHERE id = p_message_id;
    
    INSERT INTO admin_logs (event_type, detail, ip_address)
    VALUES ('chat_violation', 'Request #' || p_request_id || ' - ' || p_violation_type, 'user_report');
    
    RETURN v_radar_id;
END;
$$ LANGUAGE plpgsql;

-- MANUEL ODEME ONAY/RED (Selective Manual Control)
CREATE OR REPLACE FUNCTION process_security_payment(
    p_radar_id UUID,
    p_admin_id TEXT,
    p_action TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_request_id UUID;
    v_success BOOLEAN := false;
BEGIN
    UPDATE security_radar 
    SET status = CASE p_action WHEN 'approve' THEN 'resolved' ELSE 'rejected' END,
        admin_notes = COALESCE(p_notes, admin_notes),
        payment_released_at = CASE p_action WHEN 'approve' THEN now() ELSE NULL END,
        payment_released_by = CASE p_action WHEN 'approve' THEN p_admin_id ELSE NULL END,
        payment_hold = CASE p_action WHEN 'approve' THEN false ELSE payment_hold END
    WHERE id = p_radar_id
    RETURNING request_id INTO v_request_id;
    
    IF FOUND THEN
        UPDATE requests 
        SET security_hold = CASE p_action WHEN 'approve' THEN false ELSE true END,
            auto_capture = CASE p_action WHEN 'approve' THEN true ELSE auto_capture END,  -- Admin onayı sonrası otomatik capture aktif
            security_cleared_at = now(), 
            security_cleared_by = p_admin_id
        WHERE id = v_request_id;
        
        INSERT INTO admin_logs (event_type, detail, ip_address)
        VALUES (
            CASE p_action WHEN 'approve' THEN 'payment_release' ELSE 'payment_rejected' END,
            'Radar #' || p_radar_id || ' - Request #' || v_request_id,
            'admin_action'
        );
        
        v_success := true;
    END IF;
    
    RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- KULLANICI BAN KALDIRMA
CREATE OR REPLACE FUNCTION unban_user(p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profilkisi 
    SET is_banned = false, banned_at = NULL, banned_reason = NULL
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ADMIN ISTATISTIKLERI
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalUsers', (SELECT COUNT(*) FROM profilkisi),
        'activeJobs', (SELECT COUNT(*) FROM requests WHERE active_job = true AND status = 'accepted'),
        'completedJobs', (SELECT COUNT(*) FROM requests WHERE status = 'delivered'),
        'totalRevenue', COALESCE((SELECT SUM(commission) FROM transactions WHERE status = 'completed'), 0),
        'openSecurityAlerts', (SELECT COUNT(*) FROM security_radar WHERE status = 'open'),
        'pendingPaymentHolds', (SELECT COUNT(*) FROM security_radar WHERE payment_hold = true AND status != 'resolved')
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- PUBLIC PROFILES RPC (Önce varsa sil)
DROP FUNCTION IF EXISTS get_public_profiles(TEXT[]);

CREATE OR REPLACE FUNCTION get_public_profiles(ids TEXT[])
RETURNS TABLE(user_id TEXT, name TEXT, email TEXT, roles TEXT[], avatar_url TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.user_id, p.name, p.email, p.roles, p.avatar_url
    FROM profilkisi p
    WHERE p.user_id = ANY(ids);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. STORAGE BUCKET VE POLICIES
-- =====================================================

-- Storage bucket oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT 
USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
CREATE POLICY "Owner Update"
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 8. KOMİSYON VE ÖDEME SİSTEMİ (commission_clean.sql entegrasyonu)
-- =====================================================

-- Komisyon yapılandırma tablosu
CREATE TABLE IF NOT EXISTS commission_config (
  currency TEXT PRIMARY KEY,
  deposit_min NUMERIC NOT NULL DEFAULT 1,
  deposit_pct NUMERIC NOT NULL DEFAULT 3.5,
  transfer_min NUMERIC NOT NULL DEFAULT 0.5,
  transfer_pct NUMERIC NOT NULL DEFAULT 1.5,
  withdrawal_min NUMERIC NOT NULL DEFAULT 1,
  withdrawal_pct NUMERIC NOT NULL DEFAULT 2
);

-- Varsayılan değerleri ekle (idempotent)
INSERT INTO commission_config (currency, deposit_min, deposit_pct, transfer_min, transfer_pct, withdrawal_min, withdrawal_pct)
VALUES
  ('USD', 1, 3.5, 0.5, 1.5, 1, 2),
  ('EUR', 1, 3.5, 0.5, 1.5, 1, 2),
  ('TRY', 10, 3.5, 5, 1.5, 10, 2)
ON CONFLICT (currency) DO UPDATE SET
  deposit_min = EXCLUDED.deposit_min,
  deposit_pct = EXCLUDED.deposit_pct,
  transfer_min = EXCLUDED.transfer_min,
  transfer_pct = EXCLUDED.transfer_pct,
  withdrawal_min = EXCLUDED.withdrawal_min,
  withdrawal_pct = EXCLUDED.withdrawal_pct;

-- Cüzdan bakiyeleri tablosu
CREATE TABLE IF NOT EXISTS wallet_balances (
  user_id TEXT PRIMARY KEY REFERENCES profilkisi(user_id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT DEFAULT 'TRY',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İşlem geçmişi tablosu
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profilkisi(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'earning', 'membership_purchase')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  commission NUMERIC DEFAULT 0 CHECK (commission >= 0),
  total_amount NUMERIC,
  currency TEXT DEFAULT 'TRY' CHECK (currency IN ('USD', 'EUR', 'TRY')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  payment_intent_id TEXT,
  from_user_id TEXT REFERENCES profilkisi(user_id),
  to_user_id TEXT REFERENCES profilkisi(user_id),
  request_id UUID REFERENCES requests(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Komisyon kazançları tablosu
CREATE TABLE IF NOT EXISTS commission_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profilkisi(user_id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('deposit', 'transfer', 'withdrawal')),
  original_amount NUMERIC CHECK (original_amount >= 0),
  commission_amount NUMERIC CHECK (commission_amount >= 0),
  currency TEXT CHECK (currency IN ('USD', 'EUR', 'TRY')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escrow/Rezervasyon tutma tablosu
CREATE TABLE IF NOT EXISTS escrow_holds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  payer_id TEXT NOT NULL REFERENCES profilkisi(user_id),
  receiver_id TEXT REFERENCES profilkisi(user_id),
  payment_intent_id TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  commission NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'TRY',
  status TEXT DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

-- RLS Policies for wallet_transactions
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;

-- Wallet balances policies
DROP POLICY IF EXISTS "wallet_select_own" ON wallet_balances;
DROP POLICY IF EXISTS "wallet_update_own" ON wallet_balances;
CREATE POLICY "wallet_select_own" ON wallet_balances FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "wallet_update_own" ON wallet_balances FOR UPDATE USING (user_id = auth.uid()::text);

-- Transactions policies
DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT 
  USING (user_id = auth.uid()::text OR from_user_id = auth.uid()::text OR to_user_id = auth.uid()::text);
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT 
  WITH CHECK (user_id = auth.uid()::text);

-- =====================================================
-- 9. KOMİSYON FONKSİYONLARI
-- =====================================================

-- Komisyon hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION calculate_commission(
  p_amount NUMERIC,
  p_type TEXT,
  p_currency TEXT
) RETURNS NUMERIC AS $$
DECLARE
  v_config commission_config%ROWTYPE;
  v_min_amount NUMERIC;
  v_percentage NUMERIC;
  v_calculated NUMERIC;
  v_final NUMERIC;
BEGIN
  -- Config'den değerleri çek
  SELECT * INTO v_config 
  FROM commission_config 
  WHERE currency = COALESCE(p_currency, 'TRY');
  
  -- Currency bulunamazda varsayılan olarak TRY kullan
  IF NOT FOUND THEN
    SELECT * INTO v_config FROM commission_config WHERE currency = 'TRY';
  END IF;
  
  -- Tip bazlı değer seçimi
  CASE p_type
    WHEN 'deposit' THEN
      v_min_amount := v_config.deposit_min;
      v_percentage := v_config.deposit_pct;
    WHEN 'transfer' THEN
      v_min_amount := v_config.transfer_min;
      v_percentage := v_config.transfer_pct;
    WHEN 'withdrawal' THEN
      v_min_amount := v_config.withdrawal_min;
      v_percentage := v_config.withdrawal_pct;
    ELSE
      v_min_amount := v_config.withdrawal_min;
      v_percentage := v_config.withdrawal_pct;
  END CASE;
  
  -- Hesaplama
  v_calculated := (p_amount * v_percentage / 100);
  v_final := GREATEST(v_min_amount, v_calculated);
  
  RETURN ROUND(v_final, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atomic transfer fonksiyonu (race condition önlemi)
CREATE OR REPLACE FUNCTION atomic_transfer(
  p_from_user_id TEXT,
  p_to_user_id TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'TRY',
  p_description TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_receiver_balance NUMERIC;
  v_commission NUMERIC;
  v_receiver_amount NUMERIC;
BEGIN
  -- Validasyon
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount', 'code', 'INVALID_AMOUNT');
  END IF;
  
  IF p_from_user_id IS NULL OR p_to_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User IDs required', 'code', 'MISSING_USER_ID');
  END IF;
  
  IF p_from_user_id = p_to_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Self transfer not allowed', 'code', 'SELF_TRANSFER');
  END IF;
  
  -- Komisyon hesapla
  v_commission := calculate_commission(p_amount, 'transfer', p_currency);
  v_receiver_amount := p_amount - v_commission;
  
  -- Gönderenin bakiyesini kilitle ve kontrol et
  SELECT balance INTO v_sender_balance
  FROM wallet_balances
  WHERE user_id = p_from_user_id
  FOR UPDATE;  -- KILIT!
  
  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient balance', 
      'code', 'INSUFFICIENT_BALANCE',
      'current_balance', COALESCE(v_sender_balance, 0),
      'required', p_amount
    );
  END IF;
  
  -- Alıcının mevcut bakiyesini al
  SELECT balance INTO v_receiver_balance
  FROM wallet_balances
  WHERE user_id = p_to_user_id;
  
  -- Gönderenin bakiyesini düşür
  UPDATE wallet_balances 
  SET balance = balance - p_amount, 
      updated_at = NOW()
  WHERE user_id = p_from_user_id;
  
  -- Alıcının bakiyesini artır (veya oluştur)
  IF v_receiver_balance IS NULL THEN
    INSERT INTO wallet_balances (user_id, balance, currency)
    VALUES (p_to_user_id, v_receiver_amount, p_currency);
  ELSE
    UPDATE wallet_balances 
    SET balance = balance + v_receiver_amount, 
        updated_at = NOW()
    WHERE user_id = p_to_user_id;
  END IF;
  
  -- İşlem kayıtlarını oluştur
  INSERT INTO transactions (user_id, type, amount, commission, total_amount, currency, status, description, to_user_id)
  VALUES 
    (p_from_user_id, 'withdrawal', p_amount, v_commission, p_amount, p_currency, 'completed', 
     COALESCE(p_description, 'Transfer') || ' (Komisyon: ' || v_commission || ')', p_to_user_id),
    (p_to_user_id, 'deposit', v_receiver_amount, 0, v_receiver_amount, p_currency, 'completed',
     COALESCE(p_description, 'Transfer alındı'), NULL);
  
  -- Komisyon kaydı
  INSERT INTO commission_earnings (user_id, type, original_amount, commission_amount, currency, description)
  VALUES (p_from_user_id, 'transfer', p_amount, v_commission, p_currency, 'Transfer to ' || LEFT(p_to_user_id, 8));
  
  RETURN json_build_object(
    'success', true,
    'commission', v_commission,
    'receiver_amount', v_receiver_amount,
    'sender_new_balance', v_sender_balance - p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic escrow hold fonksiyonu (cüzdan rezervasyonu)
CREATE OR REPLACE FUNCTION atomic_escrow_hold(
  p_user_id TEXT,
  p_request_id UUID,
  p_amount NUMERIC,
  p_commission NUMERIC,
  p_receiver_id TEXT
) RETURNS JSON AS $$
DECLARE
  v_total NUMERIC;
  v_current_balance NUMERIC;
  v_hold_id UUID;
  v_existing_hold UUID;
BEGIN
  v_total := p_amount + p_commission;
  
  -- Önce mevcut aktif hold kontrolü yap
  SELECT id INTO v_existing_hold
  FROM escrow_holds
  WHERE request_id = p_request_id AND status = 'held';
  
  IF v_existing_hold IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Hold already exists for this request', 'code', 'DUPLICATE_HOLD');
  END IF;
  
  -- Bakiyeyi kilitle ve kontrol et
  SELECT balance INTO v_current_balance
  FROM wallet_balances
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL OR v_current_balance < v_total THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'code', 'INSUFFICIENT_BALANCE',
      'current_balance', COALESCE(v_current_balance, 0),
      'needed', v_total
    );
  END IF;
  
  -- Bakiyeden düş
  UPDATE wallet_balances
  SET balance = balance - v_total,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Escrow kaydı oluştur
  INSERT INTO escrow_holds (
    request_id,
    payer_id,
    receiver_id,
    payment_intent_id,
    amount,
    commission,
    net_amount,
    status
  ) VALUES (
    p_request_id,
    p_user_id,
    p_receiver_id,
    'wallet_' || p_request_id::TEXT || '_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    v_total,
    p_commission,
    p_amount,
    'held'
  )
  RETURNING id INTO v_hold_id;
  
  -- Request status güncelle
  UPDATE requests
  SET status = 'in_progress',
      payment_status = 'held',
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'success', true,
    'hold_id', v_hold_id,
    'new_balance', v_current_balance - v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic escrow refund fonksiyonu (iptal/iade)
CREATE OR REPLACE FUNCTION atomic_escrow_refund(
  p_hold_id UUID,
  p_user_id TEXT
) RETURNS JSON AS $$
DECLARE
  v_hold RECORD;
  v_is_admin BOOLEAN;
BEGIN
  -- Hold kaydını kilitle
  SELECT * INTO v_hold
  FROM escrow_holds
  WHERE id = p_hold_id AND status = 'held'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Hold not found', 'code', 'HOLD_NOT_FOUND');
  END IF;
  
  -- Yetki kontrolü
  SELECT is_admin INTO v_is_admin
  FROM profilkisi
  WHERE user_id = p_user_id;
  
  IF v_hold.payer_id != p_user_id AND NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Forbidden', 'code', 'FORBIDDEN');
  END IF;
  
  -- Bakiyeyi iade et (cüzdan hold ise)
  IF v_hold.payment_intent_id LIKE 'wallet_%' THEN
    UPDATE wallet_balances
    SET balance = balance + v_hold.amount,
        updated_at = NOW()
    WHERE user_id = v_hold.payer_id;
  END IF;
  
  -- Hold status güncelle
  UPDATE escrow_holds
  SET status = 'refunded',
      released_at = NOW()
  WHERE id = p_hold_id;
  
  -- Request status güncelle
  UPDATE requests
  SET status = 'disputed',
      payment_status = 'refunded',
      updated_at = NOW()
  WHERE id = v_hold.request_id;
  
  RETURN json_build_object(
    'success', true,
    'refunded_amount', v_hold.amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic card escrow hold fonksiyonu (Stripe kart ile rezervasyon)
CREATE OR REPLACE FUNCTION atomic_card_escrow_hold(
  p_request_id UUID,
  p_payer_id TEXT,
  p_receiver_id TEXT,
  p_payment_intent_id TEXT,
  p_amount NUMERIC,
  p_commission NUMERIC,
  p_net_amount NUMERIC
) RETURNS JSON AS $$
DECLARE
  v_existing_hold UUID;
  v_hold_id UUID;
BEGIN
  -- Önce mevcut hold kontrolü
  SELECT id INTO v_existing_hold
  FROM escrow_holds
  WHERE request_id = p_request_id AND status = 'held';
  
  IF v_existing_hold IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Hold already exists', 'code', 'DUPLICATE_HOLD');
  END IF;
  
  -- Escrow kaydı oluştur
  INSERT INTO escrow_holds (
    request_id, payer_id, receiver_id,
    payment_intent_id, amount, commission, net_amount, status
  ) VALUES (
    p_request_id, p_payer_id, p_receiver_id,
    p_payment_intent_id, p_amount, p_commission, p_net_amount, 'held'
  )
  RETURNING id INTO v_hold_id;
  
  -- Request status güncelle
  UPDATE requests
  SET status = 'in_progress',
      payment_status = 'held',
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN json_build_object('success', true, 'hold_id', v_hold_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Referral aktifleştirme fonksiyonu
CREATE OR REPLACE FUNCTION activate_referral(
  p_user_id TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_profile RECORD;
  v_referrer_profile RECORD;
BEGIN
  -- Kullanıcının referans durumunu kontrol et (kilitle)
  SELECT user_id, referred_by, referral_qualified 
  INTO v_user_profile
  FROM profilkisi
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Referansla gelmemiş veya zaten qualified
  IF v_user_profile.referred_by IS NULL OR v_user_profile.referral_qualified THEN
    RETURN json_build_object('success', false, 'reason', 'Not eligible');
  END IF;
  
  -- Kullanıcıyı qualified yap
  UPDATE profilkisi 
  SET referral_qualified = TRUE 
  WHERE user_id = p_user_id;
  
  -- Davet edenin profilini al ve güncelle
  SELECT referral_free_jobs INTO v_referrer_profile
  FROM profilkisi
  WHERE user_id = v_user_profile.referred_by
  FOR UPDATE;
  
  IF FOUND THEN
    UPDATE profilkisi
    SET referral_free_jobs = COALESCE(referral_free_jobs, 0) + 1
    WHERE user_id = v_user_profile.referred_by;
  END IF;
  
  RETURN json_build_object('success', true, 'referrer', v_user_profile.referred_by);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İndeksler
-- Partial unique index: Sadece 'held' status'unde çift rezervasyonu engelle
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_holds_unique_held 
ON escrow_holds(request_id) 
WHERE status = 'held';

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_request_id ON escrow_holds(request_id);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_payer_id ON escrow_holds(payer_id);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_user_id ON commission_earnings(user_id);

-- =====================================================
-- KURULUM TAMAMLANDI (v2.0 - Güvenlik & Komisyon Entegre)
-- =====================================================
