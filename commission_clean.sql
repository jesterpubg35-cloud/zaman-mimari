-- =============================================================================
-- KOMİSYON SİSTEMİ - CLEAN CODE REFACTOR (SonarQube Uyumlu)
-- =============================================================================

-- =============================================================================
-- 1. SABİT TANIMLAR (Constants)
-- =============================================================================

-- İşlem tipleri sabitleri
CREATE OR REPLACE FUNCTION get_transaction_types()
RETURNS TABLE(type_name text) AS $$
BEGIN
  RETURN QUERY VALUES 
    ('deposit'),
    ('transfer'),
    ('withdrawal');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Para birimi sabitleri
CREATE OR REPLACE FUNCTION get_currencies()
RETURNS TABLE(currency_code text) AS $$
BEGIN
  RETURN QUERY VALUES 
    ('USD'),
    ('EUR'),
    ('TRY');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Komisyon oranları sabit tablosu
CREATE TABLE IF NOT EXISTS commission_config (
  currency text PRIMARY KEY,
  deposit_min numeric NOT NULL,
  deposit_pct numeric NOT NULL,
  transfer_min numeric NOT NULL,
  transfer_pct numeric NOT NULL,
  withdrawal_min numeric NOT NULL,
  withdrawal_pct numeric NOT NULL
);

-- Sabit değerleri ekle (idempotent)
INSERT INTO commission_config (
  currency, 
  deposit_min, deposit_pct, 
  transfer_min, transfer_pct, 
  withdrawal_min, withdrawal_pct
) VALUES
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

-- =============================================================================
-- 2. İŞLEM GEÇMİŞİ TABLOSU
-- =============================================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  commission NUMERIC DEFAULT 0 CHECK (commission >= 0),
  total_amount NUMERIC,
  currency TEXT DEFAULT 'TRY' CHECK (currency IN ('USD', 'EUR', 'TRY')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  payment_intent_id TEXT,
  from_user_id UUID REFERENCES auth.users,
  to_user_id UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy (tekilleştirilmiş)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;

CREATE POLICY "transactions_select_own"
  ON transactions FOR SELECT
  USING (user_id = auth.uid() OR from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "transactions_insert_own"
  ON transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 3. KOMİSYON KAZANÇLARI TABLOSU
-- =============================================================================

CREATE TABLE IF NOT EXISTS commission_earnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  type TEXT CHECK (type IN ('deposit', 'transfer', 'withdrawal')),
  original_amount NUMERIC CHECK (original_amount >= 0),
  commission_amount NUMERIC CHECK (commission_amount >= 0),
  currency TEXT CHECK (currency IN ('USD', 'EUR', 'TRY')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. KOMİSYON HESAPLAMA FONKSİYONU (REFACTORED)
-- =============================================================================

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
  -- Config'den değerleri çek (tekrarlanan IF blokları ortadan kalktı)
  SELECT * INTO v_config 
  FROM commission_config 
  WHERE currency = COALESCE(p_currency, 'USD');
  
  -- Currency bulunamazda varsayılan olarak USD kullan
  IF NOT FOUND THEN
    SELECT * INTO v_config FROM commission_config WHERE currency = 'USD';
  END IF;
  
  -- Tip bazlı değer seçimi (single CASE, duplicate branches yok)
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
      -- Varsayılan: withdrawal oranları
      v_min_amount := v_config.withdrawal_min;
      v_percentage := v_config.withdrawal_pct;
  END CASE;
  
  -- Hesaplama
  v_calculated := (p_amount * v_percentage / 100);
  v_final := GREATEST(v_min_amount, v_calculated);
  
  RETURN ROUND(v_final, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- 5. PARA YATIRMA FONKSİYONU (REFACTORED)
-- =============================================================================

CREATE OR REPLACE FUNCTION deposit_with_commission(
  p_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_description TEXT
) RETURNS JSON AS $$
DECLARE
  v_commission NUMERIC;
  v_net_amount NUMERIC;
  v_txn_type CONSTANT TEXT := 'deposit';
BEGIN
  -- Validasyon
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Invalid amount',
      'code', 'INVALID_AMOUNT'
    );
  END IF;
  
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User ID required',
      'code', 'MISSING_USER_ID'
    );
  END IF;
  
  -- Komisyon hesapla
  v_commission := calculate_commission(p_amount, v_txn_type, p_currency);
  v_net_amount := p_amount - v_commission;
  
  -- Bakiye güncelle (net tutar)
  INSERT INTO wallet_balances (user_id, balance, currency)
  VALUES (p_user_id, v_net_amount, COALESCE(p_currency, 'USD'))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = wallet_balances.balance + v_net_amount, 
    updated_at = NOW();
  
  -- İşlemi kaydet (string concatenation sabitlendi)
  INSERT INTO transactions (
    user_id, 
    type, 
    amount, 
    commission,
    currency, 
    status,
    description
  ) VALUES (
    p_user_id, 
    v_txn_type, 
    v_net_amount,
    v_commission,
    COALESCE(p_currency, 'USD'),
    'completed',
    format('%s (Komisyon: %s %s)', 
           COALESCE(p_description, 'Deposit'), 
           v_commission, 
           COALESCE(p_currency, 'USD'))
  );
  
  -- Komisyonu kaydet
  INSERT INTO commission_earnings (
    user_id, 
    type, 
    original_amount, 
    commission_amount, 
    currency
  ) VALUES (
    p_user_id, 
    v_txn_type, 
    p_amount, 
    v_commission, 
    COALESCE(p_currency, 'USD')
  );
  
  RETURN json_build_object(
    'success', true, 
    'commission', v_commission, 
    'net_amount', v_net_amount,
    'type', v_txn_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. P2P TRANSFER FONKSİYONU (REFACTORED)
-- =============================================================================

CREATE OR REPLACE FUNCTION transfer_with_commission(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_description TEXT
) RETURNS JSON AS $$
DECLARE
  v_commission NUMERIC;
  v_receiver_amount NUMERIC;
  v_sender_balance NUMERIC;
  v_txn_type_sender CONSTANT TEXT := 'withdrawal';
  v_txn_type_receiver CONSTANT TEXT := 'deposit';
  v_currency CONSTANT TEXT := COALESCE(p_currency, 'USD');
BEGIN
  -- Validasyon
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount',
      'code', 'INVALID_AMOUNT'
    );
  END IF;
  
  IF p_from_user_id IS NULL OR p_to_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Both user IDs required',
      'code', 'MISSING_USER_ID'
    );
  END IF;
  
  IF p_from_user_id = p_to_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot transfer to self',
      'code', 'SELF_TRANSFER'
    );
  END IF;
  
  -- Komisyon hesapla
  v_commission := calculate_commission(p_amount, 'transfer', v_currency);
  v_receiver_amount := p_amount - v_commission;
  
  -- Gönderenin bakiyesini kontrol et (SELECT INTO for update ile kilitle)
  SELECT balance INTO v_sender_balance 
  FROM wallet_balances 
  WHERE user_id = p_from_user_id
  FOR UPDATE;
  
  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient balance',
      'code', 'INSUFFICIENT_BALANCE',
      'current_balance', COALESCE(v_sender_balance, 0),
      'required', p_amount
    );
  END IF;
  
  -- Gönderenin bakiyesini düşür
  UPDATE wallet_balances 
  SET balance = balance - p_amount, 
      updated_at = NOW()
  WHERE user_id = p_from_user_id;
  
  -- Alıcının bakiyesini artır
  INSERT INTO wallet_balances (user_id, balance, currency)
  VALUES (p_to_user_id, v_receiver_amount, v_currency)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = wallet_balances.balance + v_receiver_amount, 
    updated_at = NOW();
  
  -- İşlemleri kaydet (format() kullanımı ile string duplication çözüldü)
  INSERT INTO transactions (
    user_id, 
    type, 
    amount, 
    commission,
    currency, 
    status,
    description,
    to_user_id
  ) VALUES 
    (
      p_from_user_id, 
      v_txn_type_sender, 
      p_amount,
      v_commission,
      v_currency,
      'completed',
      format('Transfer: %s (Komisyon: %s %s)', 
             COALESCE(p_description, 'P2P'), 
             v_commission, 
             v_currency),
      p_to_user_id
    ),
    (
      p_to_user_id, 
      v_txn_type_receiver, 
      v_receiver_amount,
      0, -- Alıcı komisyon ödemez
      v_currency,
      'completed',
      format('Transfer: %s (Gönderen: %s)', 
             COALESCE(p_description, 'P2P'),
             LEFT(p_from_user_id::TEXT, 8)),
      NULL
    );
  
  -- Komisyonu kaydet
  INSERT INTO commission_earnings (
    user_id, 
    type, 
    original_amount, 
    commission_amount, 
    currency,
    description
  ) VALUES (
    p_from_user_id, 
    'transfer', 
    p_amount, 
    v_commission, 
    v_currency,
    format('Transfer to %s', LEFT(p_to_user_id::TEXT, 8))
  );
  
  RETURN json_build_object(
    'success', true, 
    'commission', v_commission, 
    'receiver_amount', v_receiver_amount,
    'sender_id', p_from_user_id,
    'receiver_id', p_to_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. YARDIMCI FONKSİYONLAR
-- =============================================================================

-- Kullanıcının komisyon geçmişini getir
CREATE OR REPLACE FUNCTION get_user_commissions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  type TEXT,
  original_amount NUMERIC,
  commission_amount NUMERIC,
  currency TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.type,
    ce.original_amount,
    ce.commission_amount,
    ce.currency,
    ce.created_at
  FROM commission_earnings ce
  WHERE ce.user_id = p_user_id
  ORDER BY ce.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Toplam komisyon istatistikleri
CREATE OR REPLACE FUNCTION get_commission_stats(
  p_currency TEXT DEFAULT NULL
) RETURNS TABLE (
  type TEXT,
  total_count BIGINT,
  total_original NUMERIC,
  total_commission NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.type,
    COUNT(*)::BIGINT,
    COALESCE(SUM(ce.original_amount), 0),
    COALESCE(SUM(ce.commission_amount), 0)
  FROM commission_earnings ce
  WHERE p_currency IS NULL OR ce.currency = p_currency
  GROUP BY ce.type
  ORDER BY ce.type;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- SON
-- =============================================================================
