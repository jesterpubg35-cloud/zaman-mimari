-- GUVENLIK RADARI MIGRASYONU
-- 1. Security Radar Tablosu
CREATE TABLE IF NOT EXISTS security_radar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    details TEXT,
    reporter_id UUID REFERENCES profilkisi(user_id) ON DELETE SET NULL,
    reported_id UUID REFERENCES profilkisi(user_id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    admin_notes TEXT,
    payment_hold BOOLEAN DEFAULT false,
    payment_released_at TIMESTAMP WITH TIME ZONE,
    payment_released_by UUID REFERENCES profilkisi(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Requests tablosuna guvenlik alanlari ekle
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS security_hold BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS security_cleared_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS security_cleared_by UUID,
ADD COLUMN IF NOT EXISTS completed_duration_minutes INTEGER;

-- 3. Messages tablosuna violation flag ekle
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS has_violation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS violation_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS violation_details TEXT;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_security_radar_request ON security_radar(request_id);
CREATE INDEX IF NOT EXISTS idx_security_radar_status ON security_radar(status);
CREATE INDEX IF NOT EXISTS idx_security_radar_type ON security_radar(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_radar_created ON security_radar(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_security_hold ON requests(security_hold) WHERE security_hold = true;

-- 5. RLS Policies
ALTER TABLE security_radar ENABLE ROW LEVEL SECURITY;

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

-- 6. Trigger function for updated_at
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

-- 7. Function: Hizli islem tespiti (3 dk alti)
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
                    'Is ' || duration_minutes || ' dakikada tamamlandi. Kabul: ' || NEW.accepted_at || ', Teslim: ' || NEW.updated_at,
                    true, 'open'
                );
                
                INSERT INTO admin_logs (event_type, detail, ip_address)
                VALUES ('security_alert', 'Request #' || NEW.id || ' - Supheli hizli tamamlanma: ' || duration_minutes || ' dk', 'system');
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
FOR EACH ROW
EXECUTE FUNCTION check_fast_completion();

-- 8. Function: Sohbet ihlali bildir
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

-- 9. Function: Manuel odeme onayi/red
CREATE OR REPLACE FUNCTION process_security_payment(
    p_radar_id UUID,
    p_admin_id UUID,
    p_action VARCHAR,
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
            'Radar #' || p_radar_id || ' - Request #' || v_request_id || ' - Admin: ' || p_admin_id,
            'admin_action'
        );
        
        v_success := true;
    END IF;
    
    RETURN v_success;
END;
$$ LANGUAGE plpgsql;
