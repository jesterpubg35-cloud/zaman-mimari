-- GÜVENLİK RADARI MİGRASYONU
-- Bu script security_radar tablosunu ve ilgili güvenlik alanlarını oluşturur

-- 1. Security Radar Tablosu
CREATE TABLE IF NOT EXISTS security_radar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'fast_completion', 'chat_violation', 'reported_worker', 'manual_review'
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    details TEXT,
    reporter_id UUID REFERENCES profilkisi(user_id) ON DELETE SET NULL,
    reported_id UUID REFERENCES profilkisi(user_id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'approved', 'rejected', 'resolved'
    admin_notes TEXT,
    payment_hold BOOLEAN DEFAULT false, -- Ödeme bloke mi?
    payment_released_at TIMESTAMP WITH TIME ZONE,
    payment_released_by UUID REFERENCES profilkisi(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Requests tablosuna güvenlik alanları ekle
ALTER TABLE requests 
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS security_hold BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS security_cleared_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS security_cleared_by UUID,
    ADD COLUMN IF NOT EXISTS completed_duration_minutes INTEGER; -- İş tamamlanma süresi (dakika)

-- 3. Messages tablosuna violation flag ekle
ALTER TABLE messages 
    ADD COLUMN IF NOT EXISTS has_violation BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS violation_type VARCHAR(50), -- 'off_platform_payment', 'contact_sharing', etc.
    ADD COLUMN IF NOT EXISTS violation_details TEXT;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_security_radar_request ON security_radar(request_id);
CREATE INDEX IF NOT EXISTS idx_security_radar_status ON security_radar(status);
CREATE INDEX IF NOT EXISTS idx_security_radar_type ON security_radar(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_radar_created ON security_radar(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_security_hold ON requests(security_hold) WHERE security_hold = true;

-- 5. RLS Policies
ALTER TABLE security_radar ENABLE ROW LEVEL SECURITY;

-- Adminler tüm kayıtları görebilir
CREATE POLICY "Admin full access on security_radar"
    ON security_radar
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profilkisi 
            WHERE user_id = auth.uid() 
            AND (roles @> '["admin"]' OR role = 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profilkisi 
            WHERE user_id = auth.uid() 
            AND (roles @> '["admin"]' OR role = 'admin')
        )
    );

-- 6. Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_security_radar_updated_at ON security_radar;
CREATE TRIGGER update_security_radar_updated_at
    BEFORE UPDATE ON security_radar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Admin Logs için security event type ekle (admin_logs tablosu varsa)
-- Not: Bu enum değerleri mevcut admin_logs tablosuna manuel eklenmelidir
-- event_type: 'security_alert', 'payment_hold', 'payment_release', 'chat_violation'

-- 8. Örnek veri (opsiyonel - test için)
-- INSERT INTO security_radar (alert_type, severity, details, status)
-- VALUES ('test', 'low', 'Migration test alert', 'resolved');

-- 9. Function: Hızlı işlemi otomatik tespit et
CREATE OR REPLACE FUNCTION check_fast_completion()
RETURNS TRIGGER AS $$
DECLARE
    duration_minutes INTEGER;
BEGIN
    -- Sadece delivered status değişiminde çalış
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        -- Kabul zamanı varsa süreyi hesapla
        IF NEW.accepted_at IS NOT NULL THEN
            duration_minutes := EXTRACT(EPOCH FROM (NEW.updated_at - NEW.accepted_at)) / 60;
            NEW.completed_duration_minutes := duration_minutes;
            
            -- 3 dakikanın altındaysa güvenlik radarına ekle
            IF duration_minutes < 3 THEN
                NEW.security_hold := true;
                
                INSERT INTO security_radar (
                    request_id,
                    alert_type,
                    severity,
                    details,
                    payment_hold,
                    status
                ) VALUES (
                    NEW.id,
                    'fast_completion',
                    CASE 
                        WHEN duration_minutes < 1 THEN 'critical'
                        WHEN duration_minutes < 2 THEN 'high'
                        ELSE 'medium'
                    END,
                    'İş ' || duration_minutes || ' dakikada tamamlandı. Kabul: ' || NEW.accepted_at || ', Teslim: ' || NEW.updated_at,
                    true,
                    'open'
                );
                
                -- Admin logs'a da kaydet
                INSERT INTO admin_logs (event_type, detail, ip_address)
                VALUES ('security_alert', 'Request #' || NEW.id || ' - Şüpheli hızlı tamamlanma: ' || duration_minutes || ' dk', 'system');
            END IF;
        END IF;
    END IF;
    
    -- accepted status'a geçişte accepted_at kaydet
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        NEW.accepted_at := COALESCE(NEW.accepted_at, now());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı requests tablosuna bağla
DROP TRIGGER IF EXISTS trg_check_fast_completion ON requests;
CREATE TRIGGER trg_check_fast_completion
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION check_fast_completion();

-- 10. Function: Sohbet ihlali bildir
CREATE OR REPLACE FUNCTION report_chat_violation(
    p_request_id UUID,
    p_message_id UUID,
    p_reporter_id UUID,
    p_reported_id UUID,
    p_violation_type VARCHAR,
    p_details TEXT
)
RETURNS UUID AS $$
DECLARE
    v_radar_id UUID;
BEGIN
    -- Güvenlik radarına ekle
    INSERT INTO security_radar (
        request_id,
        alert_type,
        severity,
        reporter_id,
        reported_id,
        details,
        status
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
    
    -- Mesajı işaretle
    UPDATE messages 
    SET has_violation = true,
        violation_type = p_violation_type,
        violation_details = p_details
    WHERE id = p_message_id;
    
    -- Admin logs
    INSERT INTO admin_logs (event_type, detail, ip_address)
    VALUES ('chat_violation', 'Request #' || p_request_id || ' - ' || p_violation_type, 'user_report');
    
    RETURN v_radar_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Function: Manuel ödeme onayı/red
CREATE OR REPLACE FUNCTION process_security_payment(
    p_radar_id UUID,
    p_admin_id UUID,
    p_action VARCHAR, -- 'approve' veya 'reject'
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_request_id UUID;
    v_success BOOLEAN := false;
BEGIN
    -- Radar kaydını güncelle
    UPDATE security_radar 
    SET status = CASE p_action WHEN 'approve' THEN 'resolved' ELSE 'rejected' END,
        admin_notes = COALESCE(p_notes, admin_notes),
        payment_released_at = CASE p_action WHEN 'approve' THEN now() ELSE NULL END,
        payment_released_by = CASE p_action WHEN 'approve' THEN p_admin_id ELSE NULL END,
        payment_hold = CASE p_action WHEN 'approve' THEN false ELSE payment_hold END
    WHERE id = p_radar_id
    RETURNING request_id INTO v_request_id;
    
    IF FOUND THEN
        -- Request tablosunu güncelle
        UPDATE requests 
        SET security_hold = CASE p_action WHEN 'approve' THEN false ELSE true END,
            security_cleared_at = now(),
            security_cleared_by = p_admin_id
        WHERE id = v_request_id;
        
        -- Admin log
        INSERT INTO admin_logs (event_type, detail, ip_address)
        VALUES (
            CASE p_action WHEN 'approve' THEN 'payment_release' ELSE 'payment_rejected' END,
            'Radar #' || p_radar_id || ' - Request #' || v_request_id || ' - Admin: ' || p_admin_id || ' - Not: ' || COALESCE(p_notes, '-'),
            'admin_action'
        );
        
        v_success := true;
    END IF;
    
    RETURN v_success;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE security_radar IS 'Güvenlik Radarı - Şüpheli işlemler ve anomaliler';
COMMENT ON COLUMN security_radar.payment_hold IS 'True ise ödeme bloke edilmiştir, admin onayı gerekir';
