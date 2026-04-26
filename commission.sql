-- İşlem geçmişi tablosu (tüm kullanıcı işlemleri)
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  type text not null, -- 'deposit', 'withdrawal', 'transfer'
  amount numeric not null,
  commission numeric default 0,
  total_amount numeric,
  currency text default 'TRY',
  status text default 'completed', -- 'pending', 'completed', 'failed'
  description text,
  payment_intent_id text,
  from_user_id uuid references auth.users,
  to_user_id uuid references auth.users,
  created_at timestamptz default now()
);

-- RLS
alter table transactions enable row level security;
create policy "Users view own transactions" on transactions for select using (user_id = auth.uid());
create policy "Users insert own transactions" on transactions for insert with check (user_id = auth.uid());

-- Komisyon tablosu (senin kazancın)
create table if not exists commission_earnings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  type text, -- 'deposit', 'transfer', 'withdrawal'
  original_amount numeric,
  commission_amount numeric,
  currency text, -- 'USD', 'EUR', 'TRY'
  created_at timestamptz default now()
);

-- RLS
alter table commission_earnings enable row level security;

-- Komisyon hesaplama fonksiyonu (GLOBAL: min + yüzde)
create or replace function calculate_commission(
  p_amount numeric,
  p_type text, -- 'deposit', 'transfer', 'withdrawal'
  p_currency text -- 'USD', 'EUR', 'TRY'
) returns numeric as $$
declare
  min_amount numeric;
  percentage numeric;
  calculated numeric;
  final_commission numeric;
begin
  -- Para birimine göre minimum komisyon
  case p_currency
    when 'USD' then
      if p_type = 'deposit' then min_amount := 1; percentage := 3.5;
      elsif p_type = 'transfer' then min_amount := 0.5; percentage := 1.5;
      else min_amount := 1; percentage := 2;
      end if;
    when 'EUR' then
      if p_type = 'deposit' then min_amount := 1; percentage := 3.5;
      elsif p_type = 'transfer' then min_amount := 0.5; percentage := 1.5;
      else min_amount := 1; percentage := 2;
      end if;
    when 'TRY' then
      if p_type = 'deposit' then min_amount := 10; percentage := 3.5;
      elsif p_type = 'transfer' then min_amount := 5; percentage := 1.5;
      else min_amount := 10; percentage := 2;
      end if;
    else
      -- Varsayılan USD
      if p_type = 'deposit' then min_amount := 1; percentage := 3.5;
      elsif p_type = 'transfer' then min_amount := 0.5; percentage := 1.5;
      else min_amount := 1; percentage := 2;
      end if;
  end case;
  
  -- Hesapla: max(minimum, yüzde)
  calculated := (p_amount * percentage / 100);
  final_commission := greatest(min_amount, calculated);
  
  return round(final_commission, 2);
end;
$$ language plpgsql;

-- Para yatırma fonksiyonu (komisyonlu)
create or replace function deposit_with_commission(
  p_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_description text
) returns json as $$
declare
  commission numeric;
  net_amount numeric;
begin
  -- Komisyon hesapla
  commission := calculate_commission(p_amount, 'deposit', p_currency);
  net_amount := p_amount - commission;
  
  -- Kullanıcıya net tutar ekle
  insert into wallet_balances (user_id, balance, currency)
  values (p_user_id, net_amount, p_currency)
  on conflict (user_id) 
  do update set 
    balance = wallet_balances.balance + net_amount, 
    updated_at = now();
  
  -- İşlemi kaydet
  insert into transactions (user_id, type, amount, currency, description)
  values (p_user_id, 'deposit', net_amount, p_currency, 
          p_description || ' (Komisyon: ' || commission || ' ' || p_currency || ')');
  
  -- Komisyonu kaydet
  insert into commission_earnings (user_id, type, original_amount, commission_amount, currency)
  values (p_user_id, 'deposit', p_amount, commission, p_currency);
  
  return json_build_object('success', true, 'commission', commission, 'net_amount', net_amount);
end;
$$ language plpgsql security definer;

-- P2P Transfer fonksiyonu (komisyonlu)
create or replace function transfer_with_commission(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_description text
) returns json as $$
declare
  commission numeric;
  receiver_amount numeric;
  sender_balance numeric;
begin
  -- Komisyon hesapla
  commission := calculate_commission(p_amount, 'transfer', p_currency);
  receiver_amount := p_amount - commission;
  
  -- Gönderenin bakiyesini kontrol et
  select balance into sender_balance 
  from wallet_balances 
  where user_id = p_from_user_id;
  
  if sender_balance is null or sender_balance < p_amount then
    return json_build_object('success', false, 'error', 'Insufficient balance');
  end if;
  
  -- Gönderenin bakiyesini düşür
  update wallet_balances 
  set balance = balance - p_amount, updated_at = now()
  where user_id = p_from_user_id;
  
  -- Alıcının bakiyesini artır
  insert into wallet_balances (user_id, balance, currency)
  values (p_to_user_id, receiver_amount, p_currency)
  on conflict (user_id) 
  do update set balance = wallet_balances.balance + receiver_amount, updated_at = now();
  
  -- İşlemleri kaydet
  insert into transactions (user_id, type, amount, currency, description)
  values 
    (p_from_user_id, 'withdrawal', p_amount, p_currency, 
     'Transfer: ' || p_description || ' (Komisyon: ' || commission || ' ' || p_currency || ')'),
    (p_to_user_id, 'deposit', receiver_amount, p_currency, 
     'Transfer: ' || p_description);
  
  -- Komisyonu kaydet
  insert into commission_earnings (user_id, type, original_amount, commission_amount, currency, description)
  values (p_from_user_id, 'transfer', p_amount, commission, p_currency, 'Transfer to ' || p_to_user_id::text);
  
  return json_build_object('success', true, 'commission', commission, 'receiver_amount', receiver_amount);
end;
$$ language plpgsql security definer;
