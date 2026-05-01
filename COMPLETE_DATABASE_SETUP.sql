-- =====================================================
-- TICK PLATFORM - TUM DATABASE SETUP
-- Tarih: 29.04.2026
-- =====================================================

-- =====================================================
-- 1. TABLOLAR (Mevcut tablolarınız varsa atlayabilirsiniz)
-- =====================================================

-- Profil Kisi Tablosu (temel kullanici tablosu)
CREATE TABLE IF NOT EXISTS profilkisi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    roles TEXT[] DEFAULT ARRAY['musteri'],
    role TEXT DEFAULT 'musteri',
    is_available BOOLEAN DEFAULT true,
    service_radius INTEGER DEFAULT 5000,
    is_verified BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    banned_at TIMESTAMP WITH TIME ZONE,
    banned_reason TEXT,
    stripe_account_id TEXT,
    stripe_connected BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Requests (Is Talepleri) Tablosu
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES profilkisi(user_id),
    receiver_id UUID REFERENCES profilkisi(user_id),
    title TEXT,
    description TEXT,
    price DECIMAL(10,2),
    negotiation_price DECIMAL(10,2),
    negotiation_by UUID,
    negotiation_status TEXT DEFAULT 'closed',
    status TEXT DEFAULT 'pending',
    active_job BOOLEAN DEFAULT false,
    delivery_code TEXT,
    sender_confirmed BOOLEAN DEFAULT false,
    receiver_confirmed BOOLEAN DEFAULT false,
    payment_status TEXT DEFAULT 'pending',
    payment_intent_id TEXT,
    commission DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    -- Guvenlik alanlari
    accepted_at TIMESTAMP WITH TIME ZONE,
    security_hold BOOLEAN DEFAULT false,
    security_cleared_at TIMESTAMP WITH TIME ZONE,
    security_cleared_by UUID,
    completed_duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Messages (Mesajlar) Tablosu
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profilkisi(user_id),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    -- Guvenlik alanlari
    has_violation BOOLEAN DEFAULT false,
    violation_type TEXT,
    violation_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Transactions (Islemler) Tablosu
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profilkisi(user_id),
    type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    status TEXT DEFAULT 'completed',
    payment_intent_id TEXT,
    request_id UUID REFERENCES requests(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Wallet Balances (Cuzdan Bakiyeleri) Tablosu
CREATE TABLE IF NOT EXISTS wallet_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES profilkisi(user_id),
    balance DECIMAL(10,2) DEFAULT 0,
    pending_balance DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Reviews (Degerlendirmeler) Tablosu
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profilkisi(user_id),
    reviewee_id UUID NOT NULL REFERENCES profilkisi(user_id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Reports (Sikayetler) Tablosu
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES profilkisi(user_id),
    reported_id UUID NOT NULL REFERENCES profilkisi(user_id),
    request_id UUID REFERENCES requests(id),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Suggestions (Oneriler) Tablosu
CREATE TABLE IF NOT EXISTS suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profilkisi(user_id),
    content TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin Logs Tablosu
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    detail TEXT,
    user_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin Login Attempts Tablosu
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    success BOOLEAN DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 2. GUVENLIK RADARI TABLOSU (YENI)
-- =====================================================

CREATE TABLE IF NOT EXISTS security_radar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    details TEXT,
    reporter_id UUID REFERENCES profilkisi(user_id) ON DELETE SET NULL,
    reported_id UUID REFERENCES profilkisi(user_id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open',
    admin_notes TEXT,
    payment_hold BOOLEAN DEFAULT false,
    payment_released_at TIMESTAMP WITH TIME ZONE,
    payment_released_by UUID REFERENCES profilkisi(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 3. INDEXLER
-- =====================================================

-- Profil Kisi Indexleri
CREATE INDEX IF NOT EXISTS idx_profilkisi_user_id ON profilkisi(user_id);
CREATE INDEX IF NOT EXISTS idx_profilkisi_roles ON profilkisi USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_profilkisi_is_banned ON profilkisi(is_banned) WHERE is_banned = true;

-- Requests Indexleri
CREATE INDEX IF NOT EXISTS idx_requests_sender ON requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_requests_receiver ON requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_active ON requests(active_job) WHERE active_job = true;
CREATE INDEX IF NOT EXISTS idx_requests_security_hold ON requests(security_hold) WHERE security_hold = true;

-- Messages Indexleri
CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_violation ON messages(has_violation) WHERE has_violation = true;

-- Security Radar Indexleri
CREATE INDEX IF NOT EXISTS idx_security_radar_request ON security_radar(request_id);
CREATE INDEX IF NOT EXISTS idx_security_radar_status ON security_radar(status);
CREATE INDEX IF NOT EXISTS idx_security_radar_type ON security_radar(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_radar_created ON security_radar(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_radar_payment_hold ON security_radar(payment_hold) WHERE payment_hold = true;

-- Transactions Indexleri
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- =====================================================
-- 4. RLS POLICILERI (Row Level Security)
-- =====================================================

-- Profil Kisi RLS
ALTER TABLE profilkisi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile"
ON profilkisi FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update own profile"
ON profilkisi FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Requests RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view related requests"
ON requests FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users insert own requests"
ON requests FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users update related requests"
ON requests FOR UPDATE TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view related messages"
ON messages FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM requests 
        WHERE requests.id = messages.request_id 
        AND (requests.sender_id = auth.uid() OR requests.receiver_id = auth.uid())
    )
);

CREATE POLICY "Users insert own messages"
ON messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Security Radar RLS (Sadece Admin)
ALTER TABLE security_radar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on security_radar"
ON security_radar FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profilkisi 
        WHERE user_id = auth.uid() 
        AND (roles @> ARRAY['admin'] OR role = 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profilkisi 
        WHERE user_id = auth.uid() 
        AND (roles @> ARRAY['admin'] OR role = 'admin')
    )
);

-- Transactions RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
ON transactions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Reviews RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view reviews"
ON reviews FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users insert own reviews"
ON reviews FOR INSERT TO authenticated
WITH CHECK (reviewer_id = auth.uid());

-- Reports RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reports"
ON reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

CREATE POLICY "Users insert own reports"
ON reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Suggestions RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert suggestions"
ON suggestions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own suggestions"
ON suggestions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admin Logs RLS (Sadece Admin)
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin view logs"
ON admin_logs FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profilkisi 
        WHERE user_id = auth.uid() 
        AND (roles @> ARRAY['admin'] OR role = 'admin')
    )
);

-- =====================================================
-- 5. TRIGGER FONKSIYONLARI
-- =====================================================

-- Updated_at otomatik guncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profil Kisi updated_at
DROP TRIGGER IF EXISTS update_profilkisi_updated_at ON profilkisi;
CREATE TRIGGER update_profilkisi_updated_at
BEFORE UPDATE ON profilkisi
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Requests updated_at
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
BEFORE UPDATE ON requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Security Radar updated_at
DROP TRIGGER IF EXISTS update_security_radar_updated_at ON security_radar;
CREATE TRIGGER update_security_radar_updated_at
BEFORE UPDATE ON security_radar
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. GUVENLIK RADARI OZEL FONKSIYONLARI
-- =====================================================

-- Hizli islem tespiti (3 dk alti)
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
                    NEW.id, 'fast_completion',
                    CASE 
                        WHEN duration_minutes < 1 THEN 'critical'
                        WHEN duration_minutes < 2 THEN 'high'
                        ELSE 'medium'
                    END,
                    'Is ' || duration_minutes || ' dakikada tamamlandi',
                    true, 'open'
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

-- Sohbet ihlali bildir
CREATE OR REPLACE FUNCTION report_chat_violation(
    p_request_id UUID,
    p_message_id UUID,
    p_reporter_id UUID,
    p_reported_id UUID,
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
        p_request_id, 'chat_violation',
        CASE p_violation_type 
            WHEN 'off_platform_payment' THEN 'high'
            WHEN 'contact_sharing' THEN 'medium'
            ELSE 'medium'
        END,
        p_reporter_id, p_reported_id, p_details, 'open'
    )
    RETURNING id INTO v_radar_id;
    
    UPDATE messages 
    SET has_violation = true, violation_type = p_violation_type, violation_details = p_details
    WHERE id = p_message_id;
    
    INSERT INTO admin_logs (event_type, detail, ip_address)
    VALUES ('chat_violation', 'Request #' || p_request_id || ' - ' || p_violation_type, 'user_report');
    
    RETURN v_radar_id;
END;
$$ LANGUAGE plpgsql;

-- Manuel odeme onayi/red
CREATE OR REPLACE FUNCTION process_security_payment(
    p_radar_id UUID,
    p_admin_id UUID,
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
            security_cleared_at = now(), security_cleared_by = p_admin_id
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

-- =====================================================
-- 7. RPC FONKSIYONLARI (Supabase cagrilari icin)
-- =====================================================

-- Admin istatistikleri
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

-- Kullanici ban kaldirma
CREATE OR REPLACE FUNCTION unban_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profilkisi 
    SET is_banned = false, banned_at = NULL, banned_reason = NULL
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. ORNEK VERILER (Opsiyonel)
-- =====================================================

-- Admin kullanicisi (kendi emailinizle degistirin)
-- INSERT INTO profilkisi (user_id, name, email, roles, role, is_verified)
-- VALUES (
--     'sizin-user-uuid-niz',
--     'Admin User',
--     'admin@example.com',
--     ARRAY['admin', 'musteri'],
--     'admin',
--     true
-- );

-- =====================================================
-- KURULUM TAMAMLANDI
-- =====================================================
