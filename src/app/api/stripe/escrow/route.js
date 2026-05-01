import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, limiter } from '../../_lib/auth';

const PLATFORM_COMMISSION = 0.10; // %10
// Para birimi kasıtlı olarak TRY'de sabitlenmiştir.
// Uluslararası kartlar Stripe tarafından otomatik çevrilir; kur riski bankaya aittir.

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2023-10-16' });
};

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
};

/**
 * TICK Escrow API - Seçici Manuel Kontrol (Selective Manual Control)
 * 
 * Finansal Akış Ayrımı:
 * - 3 dk < işlem: Otomatik capture (auto_capture: true)
 * - 3 dk > işlem: Manuel onayda bekle (security_hold: true)
 * 
 * Actions: 'hold' | 'release' | 'refund' | 'auto_release'
 */

// Güvenlik başlıkları
const getSecurityHeaders = () => ({
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000'
});

// Rate limit (brute-force koruması) - Memory Leak önlemek için temizlik eklendi
const rateLimitStore = new Map();
const RATE_LIMIT_CLEANUP_INTERVAL = 300000; // 5 dakika

// Periyodik temizlik - bellek sızıntısını önle
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.resetTime > 600000) { // 10dk eski kayıtları sil
        rateLimitStore.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) console.log(`[Escrow RateLimit] ${cleaned} eski kayıt temizlendi`);
  }, RATE_LIMIT_CLEANUP_INTERVAL);
}

const checkRateLimit = (ip, isAdmin = false) => {
  const now = Date.now();
  const key = `${ip}:${isAdmin ? 'admin' : 'normal'}`;
  const max = isAdmin ? 5 : 20;
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
    return { allowed: true };
  }
  if (record.count >= max) return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  record.count++;
  return { allowed: true };
};

// Input sanitization (SQL/XSS koruması)
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // SQL injection pattern engelleme
  const sqlPattern = /(\%27)|(\')|(\-\-)|(\%23)|(#)|(\%3B)|(;)|(\b(union|select|insert|delete|drop|alter)\b)/i;
  if (sqlPattern.test(input)) throw new Error('Invalid input detected');
  // XSS koruması
  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// POST /api/stripe/escrow
// action: 'hold' | 'release' | 'refund' | 'auto_release'
export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(ip, false);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many requests', retryAfter: rateCheck.retryAfter }, { status: 429, headers: getSecurityHeaders() });
    }

    const { user, error: authError } = await verifyAuth(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Input sanitization
    const action = sanitizeInput(body.action);
    const requestId = sanitizeInput(body.requestId);
    const amount = typeof body.amount === 'number' ? body.amount : null;
    const paymentMethodId = sanitizeInput(body.paymentMethodId);
    const useWallet = body.useWallet === true;
    const autoCapture = body.autoCapture === true; // 3 dk < işlemler için

    if (!action || !requestId) {
      return NextResponse.json({ error: 'action and requestId required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const stripe = getStripe();

    // --- WALLET HOLD: Cüzdan bakiyesinden escrow ---
    if (action === 'hold' && useWallet) {
      if (!amount) return NextResponse.json({ error: 'amount required' }, { status: 400 });

      const { data: jobReq } = await supabase
        .from('requests')
        .select('id, sender_id, receiver_id, status')
        .eq('id', requestId)
        .single();

      if (!jobReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      if (jobReq.sender_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const commission = Math.round(amount * PLATFORM_COMMISSION * 100) / 100;
      const total = amount + commission;

      // ATOMIC WALLET HOLD: Veritabanı fonksiyonu kullan
      const { data: holdResult, error: holdError } = await supabase.rpc('atomic_escrow_hold', {
        p_user_id: user.id,
        p_request_id: requestId,
        p_amount: amount,
        p_commission: commission,
        p_receiver_id: jobReq.receiver_id
      });

      if (holdError || !holdResult?.success) {
        return NextResponse.json({ 
          error: holdResult?.error || holdError?.message || 'Bakiye yetersiz veya işlem hatası',
          code: holdResult?.code || 'HOLD_ERROR',
          details: { needed: total, current: holdResult?.current_balance }
        }, { status: holdResult?.code === 'INSUFFICIENT_BALANCE' ? 400 : 500 });
      }

      return NextResponse.json({ success: true, method: 'wallet', holdId: holdResult.hold_id });
    }

    // --- HOLD: Müşteri işi başlattığında ödemeyi dondur (kart ile) ---
    if (action === 'hold') {
      if (!amount || !paymentMethodId) {
        return NextResponse.json({ error: 'amount and paymentMethodId required' }, { status: 400 });
      }

      // İş talebini doğrula - sender müşteri mi?
      const { data: jobReq } = await supabase
        .from('requests')
        .select('id, sender_id, receiver_id, status')
        .eq('id', requestId)
        .single();

      if (!jobReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      if (jobReq.sender_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (jobReq.status !== 'accepted') return NextResponse.json({ error: 'Job not accepted yet' }, { status: 400 });

      // Hizmet verenin Stripe account ID'sini al
      const { data: provider } = await supabase
        .from('profilkisi')
        .select('stripe_account_id')
        .eq('user_id', jobReq.receiver_id)
        .single();

      if (!provider?.stripe_account_id) {
        return NextResponse.json({ error: 'Provider has no Stripe account' }, { status: 400 });
      }

      const amountCents = Math.round(amount * 100);
      const commissionCents = Math.round(amountCents * PLATFORM_COMMISSION);
      const transferCents = amountCents - commissionCents;

      // capture_method: manual → para hold'da bekler, henüz çekilmez
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'try',
        payment_method: paymentMethodId,
        capture_method: 'manual',
        confirm: true,
        application_fee_amount: commissionCents,
        transfer_data: { destination: provider.stripe_account_id },
        metadata: {
          requestId,
          senderId: jobReq.sender_id,
          receiverId: jobReq.receiver_id,
          transferAmount: transferCents,
          commissionAmount: commissionCents,
        },
      });

      // ATOMIC CARD HOLD: Tüm DB işlemleri tek transaction'da
      const { data: cardHoldResult, error: cardHoldError } = await supabase.rpc('atomic_card_escrow_hold', {
        p_request_id: requestId,
        p_payer_id: user.id,
        p_receiver_id: jobReq.receiver_id,
        p_payment_intent_id: paymentIntent.id,
        p_amount: amount,
        p_commission: Math.round(amount * PLATFORM_COMMISSION * 100) / 100,
        p_net_amount: Math.round(amount * (1 - PLATFORM_COMMISSION) * 100) / 100
      });

      if (cardHoldError || !cardHoldResult?.success) {
        // Stripe'taki hold'u iptal et (DB kaydı yapılamadıysa)
        try {
          await stripe.paymentIntents.cancel(paymentIntent.id);
        } catch {}
        return NextResponse.json({ 
          error: cardHoldResult?.error || cardHoldError?.message || 'Escrow kaydı başarısız',
          code: 'ESCROW_DB_ERROR'
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        paymentIntentId: paymentIntent.id,
        holdId: cardHoldResult.hold_id,
        message: 'Ödeme başarıyla rezerve edildi'
      });
    }

    // --- RELEASE: Alıcı onayladığında parayı serbest bırak ---
    if (action === 'release') {
      // Sadece müşteri (sender) onaylayabilir
      const { data: hold } = await supabase
        .from('escrow_holds')
        .select('*')
        .eq('request_id', requestId)
        .eq('status', 'held')
        .single();

      if (!hold) return NextResponse.json({ error: 'No active hold found' }, { status: 404 });
      if (hold.payer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      // === SEÇİCİ MANUEL KONTROL MANTIĞI ===
      // 3 dakikadan uzun işlemler: Otomatik capture (auto_capture: true)
      // 3 dakikadan kısa işlemler: Manuel onayda bekle (security_hold: true)
      const { data: requestCheck } = await supabase
        .from('requests')
        .select('security_hold, completed_duration_minutes, auto_capture')
        .eq('id', requestId)
        .single();

      // Eğer security_hold aktifse (3dk altı işlem) → Manuel onay gerekli
      if (requestCheck?.security_hold) {
        return NextResponse.json({ 
          error: 'Payment blocked by security radar',
          code: 'SECURITY_HOLD',
          message: 'Bu işlem güvenlik incelemesindedir (3 dakikadan kısa). Admin onayı sonrası ödeme serbest bırakılacaktır.'
        }, { status: 403, headers: getSecurityHeaders() });
      }

      // Eğer auto_capture=false ise (manuel mod) → Blokla
      if (requestCheck?.auto_capture === false) {
        return NextResponse.json({ 
          error: 'Payment requires manual approval',
          code: 'MANUAL_HOLD',
          message: 'Bu ödeme manuel onay bekliyor. Admin panelinden onaylayabilirsiniz.'
        }, { status: 403, headers: getSecurityHeaders() });
      }

      // CAPTURE: Para hizmet verene aktarılır
      const captured = await stripe.paymentIntents.capture(hold.payment_intent_id);
      
      if (captured.status !== 'succeeded') {
        return NextResponse.json({ 
          error: 'Capture failed', 
          code: 'CAPTURE_ERROR',
          details: captured.status 
        }, { status: 502, headers: getSecurityHeaders() });
      }

      await supabase.from('escrow_holds').update({ status: 'released', released_at: new Date().toISOString() }).eq('id', hold.id);
      await supabase.from('requests').update({ status: 'completed', payment_status: 'released' }).eq('id', requestId);

      // Provider kazanç kaydı
      await supabase.from('transactions').insert({
        user_id: hold.receiver_id,
        type: 'earning',
        amount: hold.net_amount,
        commission: hold.commission,
        total_amount: hold.amount,
        status: 'completed',
        payment_intent_id: hold.payment_intent_id,
        request_id: requestId,
        description: `İş tamamlandı - kazanç (${requestCheck?.completed_duration_minutes || '?'} dk)`,
      });

      return NextResponse.json({ 
        success: true, 
        captured: true,
        transferAmount: hold.net_amount,
        commission: hold.commission,
        autoCapture: requestCheck?.auto_capture !== false
      }, { headers: getSecurityHeaders() });
    }

    // --- REFUND: Anlaşmazlık / iptal ---
    if (action === 'refund') {
      // Önce hold kaydını bul (ama kilitleme - RPC yapacak)
      const { data: hold } = await supabase
        .from('escrow_holds')
        .select('id, payment_intent_id')
        .eq('request_id', requestId)
        .eq('status', 'held')
        .single();

      if (!hold) return NextResponse.json({ error: 'No active hold found' }, { status: 404 });

      // ATOMIC REFUND: Veritabanı fonksiyonu kullan
      const { data: refundResult, error: refundError } = await supabase.rpc('atomic_escrow_refund', {
        p_hold_id: hold.id,
        p_user_id: user.id
      });

      if (refundError || !refundResult?.success) {
        return NextResponse.json({ 
          error: refundResult?.error || refundError?.message || 'Refund failed',
          code: refundResult?.code || 'REFUND_ERROR'
        }, { status: refundResult?.code === 'FORBIDDEN' ? 403 : 500 });
      }

      // Stripe hold ise payment intent'i de iptal et (cüzdan holdları zaten atomic fonksiyonda iade edildi)
      if (!hold.payment_intent_id.startsWith('wallet_')) {
        try {
          await stripe.paymentIntents.cancel(hold.payment_intent_id);
        } catch (stripeError) {
          // Stripe hatası loglanır ama işlem devam eder (bakiye zaten iade edildi)
          console.error('Stripe cancel error (non-critical):', stripeError);
        }
      }

      return NextResponse.json({ 
        success: true, 
        refundedAmount: refundResult.refunded_amount,
        message: 'İşlem iptal edildi ve bakiye iade edildi'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: getSecurityHeaders() });

  } catch (error) {
    if (error.message === 'Invalid input detected') {
      return NextResponse.json({ error: 'Security violation detected', code: 'SECURITY_VIOLATION' }, { status: 403, headers: getSecurityHeaders() });
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers: getSecurityHeaders() });
  }
}
