import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const ADMIN_PANEL_KEY = process.env.ADMIN_PANEL_KEY || '';

/**
 * TICK Admin Security API - Seçici Manuel Kontrol
 * Güvenlik Radar & Ödeme Onay/Red İşlemleri
 * @version 2.0 - Security Hardened
 */

// Güvenlik başlıkları
const getSecurityHeaders = () => ({
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https://*.supabase.co https://api.stripe.com;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000'
});

// Rate limit (brute-force koruması) - Admin için daha katı
const rateLimitStore = new Map();
const checkRateLimit = (ip) => {
  const now = Date.now();
  const key = `admin:${ip}`;
  const max = 10; // Admin için 10 istek/dakika
  const window = 60000; // 1 dakika
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + window });
    return { allowed: true, remaining: max - 1 };
  }
  if (record.count >= max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }
  record.count++;
  return { allowed: true, remaining: max - record.count };
};

// Input sanitization
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  const sqlPattern = /(\%27)|(\')|(\-\-)|(\%23)|(#)|(\%3B)|(;)|(\b(union|select|insert|delete|drop|alter)\b)/i;
  if (sqlPattern.test(input)) throw new Error('Invalid input detected');
  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase config');
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

function getClients(req) {
  const adminKey = req.headers.get('x-admin-key') || '';
  const bearerToken = (req.headers.get('authorization') || '').replace(/^bearer /i, '').trim();
  const candidateKey = adminKey || bearerToken;
  
  if (candidateKey && candidateKey === ADMIN_PANEL_KEY) {
    const adminClient = createAdminClient();
    return { adminClient, uid: 'admin' };
  }
  return { adminClient: null, uid: null };
}

// GET: Güvenlik radarı verilerini çek
export async function GET(req) {
  try {
    // Rate limit kontrolü
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many requests', retryAfter: rateCheck.retryAfter }, { status: 429, headers: getSecurityHeaders() });
    }
    
    const { adminClient } = getClients(req);
    if (!adminClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'radar';

    if (type === 'radar') {
      // Tüm açık güvenlik uyarılarını çek
      const { data: radar, error } = await adminClient
        .from('security_radar')
        .select(`
          *,
          request:request_id(id, status, price, created_at, accepted_at, completed_duration_minutes),
          reporter:reporter_id(name, email, phone),
          reported:reported_id(name, email, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: getSecurityHeaders() });
      }

      return NextResponse.json({ radar: radar || [] }, { headers: getSecurityHeaders() });
    }

    if (type === 'stats') {
      // Radar istatistikleri
      const { data: stats } = await adminClient.rpc('get_security_stats');
      return NextResponse.json({ stats }, { headers: getSecurityHeaders() });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400, headers: getSecurityHeaders() });
  } catch (e) {
    if (e.message === 'Invalid input detected') {
      return NextResponse.json({ error: 'Security violation', code: 'SECURITY_VIOLATION' }, { status: 403, headers: getSecurityHeaders() });
    }
    return NextResponse.json({ error: e.message }, { status: 500, headers: getSecurityHeaders() });
  }
}

// Stripe instance
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// POST: Ödeme onayı/red veya yeni bildirim
export async function POST(req) {
  try {
    // Rate limit kontrolü
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many requests', retryAfter: rateCheck.retryAfter }, { status: 429, headers: getSecurityHeaders() });
    }
    
    const { adminClient } = getClients(req);
    if (!adminClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() });
    }

    const body = await req.json();
    // Input sanitization
    const action = sanitizeInput(body.action);
    const radar_id = sanitizeInput(body.radar_id);
    const admin_id = sanitizeInput(body.admin_id);
    const notes = sanitizeInput(body.notes);
    const cancel_job = body.cancel_job;

    if (!action || !radar_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ödeme işlemi (onay/red)
    if (action === 'approve_payment' || action === 'reject_payment') {
      const stripe = getStripe();
      
      // Radar kaydını ve ilişkili request'i çek
      const { data: radarData, error: radarError } = await adminClient
        .from('security_radar')
        .select('*, request:request_id(*)')
        .eq('id', radar_id)
        .single();
      
      if (radarError || !radarData) {
        return NextResponse.json({ error: 'Radar record not found' }, { status: 404 });
      }

      const request = radarData.request;
      
      // Ödeme bilgilerini çek
      const { data: paymentData } = await adminClient
        .from('transactions')
        .select('*')
        .eq('request_id', request.id)
        .eq('type', 'escrow_hold')
        .single();

      // ONAY: Ödemeyi hizmet verene (provider) transfer et
      let stripeSuccess = false;
      let stripeError = null;
      
      if (action === 'approve_payment') {
        try {
          // Önce Payment Intent'i capture et (manuel hold'dan çek)
          if (paymentData?.payment_intent_id) {
            const captured = await stripe.paymentIntents.capture(paymentData.payment_intent_id);
            
            if (captured.status === 'succeeded') {
              // Hizmet verenin Stripe account ID'sini çek
              const { data: provider } = await adminClient
                .from('profilkisi')
                .select('stripe_account_id')
                .eq('user_id', request.receiver_id)
                .single();

              if (provider?.stripe_account_id) {
                // Platformdan hizmet verene transfer (komisyon düşülerek)
                const commission = Math.round(captured.amount * 0.10); // %10 komisyon
                const transferAmount = captured.amount - commission;
                
                // Transfer oluştur
                await stripe.transfers.create({
                  amount: transferAmount,
                  currency: 'try',
                  destination: provider.stripe_account_id,
                  transfer_group: request.id,
                  metadata: {
                    request_id: request.id,
                    commission: commission,
                    approved_by: admin_id,
                    radar_id: radar_id
                  }
                });

                stripeSuccess = true;
                
                // Transaction'ı güncelle
                await adminClient.from('transactions').insert({
                  request_id: request.id,
                  user_id: request.receiver_id,
                  type: 'escrow_release',
                  amount: transferAmount / 100, // TL'ye çevir
                  status: 'completed',
                  description: 'Güvenlik onayı sonrası ödeme transferi'
                });
              }
            }
          }
        } catch (stripeErr) {
          stripeError = stripeErr.message;
          // HATA: DB güncellenmeyecek, admin'e hata göster
          return NextResponse.json({ 
            error: 'Stripe transfer failed', 
            details: stripeErr.message,
            code: 'STRIPE_TRANSFER_ERROR'
          }, { status: 502 });
        }
      }

      // RED: Ödemeyi müşteriye iade et
      if (action === 'reject_payment') {
        try {
          if (paymentData?.payment_intent_id) {
            // Hold'da bekleyen Payment Intent'i iptal et (iade)
            const cancelled = await stripe.paymentIntents.cancel(paymentData.payment_intent_id);
            
            if (cancelled.status === 'canceled') {
              // Transaction'ı güncelle
              await adminClient.from('transactions').insert({
                request_id: request.id,
                user_id: request.sender_id,
                type: 'refund',
                amount: paymentData.amount,
                status: 'completed',
                description: 'Güvenlik ihlali nedeniyle iptal/iade'
              });
            }
          }
        } catch (stripeErr) {
          // HATA: DB güncellenmeyecek, admin'e hata göster
          return NextResponse.json({ 
            error: 'Stripe refund failed', 
            details: stripeErr.message,
            code: 'STRIPE_REFUND_ERROR'
          }, { status: 502 });
        }
      }

      // DB'de radar kaydını güncelle
      const { error: updateError } = await adminClient.rpc(
        'process_security_payment',
        {
          p_radar_id: radar_id,
          p_admin_id: admin_id,
          p_action: action === 'approve_payment' ? 'approve' : 'reject',
          p_notes: notes || null
        }
      );

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500, headers: getSecurityHeaders() });
      }

      // İşi iptal et seçeneği işaretliyse (reddetme durumunda)
      if (cancel_job && action === 'reject_payment') {
        await adminClient
          .from('requests')
          .update({ 
            status: 'cancelled_security',
            cancelled_at: new Date().toISOString(),
            cancel_reason: 'Security violation - ' + (notes || 'Manual review')
          })
          .eq('id', request.id);
      }

      return NextResponse.json({ 
        success: true, 
        action: action,
        message: action === 'approve_payment' 
          ? 'Ödeme onaylandı ve hizmet veren hesabına transfer edildi' 
          : 'Ödeme reddedildi ve müşteriye iade edildi'
      }, { headers: getSecurityHeaders() });
    }

    // İnceleme durumu güncelleme
    if (action === 'update_status') {
      const { status } = body;
      const { error } = await adminClient
        .from('security_radar')
        .update({ 
          status: status,
          admin_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', radar_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: getSecurityHeaders() });
      }

      return NextResponse.json({ success: true, message: 'Durum güncellendi' }, { headers: getSecurityHeaders() });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400, headers: getSecurityHeaders() });
  } catch (e) {
    if (e.message === 'Invalid input detected') {
      return NextResponse.json({ error: 'Security violation detected', code: 'SECURITY_VIOLATION' }, { status: 403, headers: getSecurityHeaders() });
    }
    return NextResponse.json({ error: e.message }, { status: 500, headers: getSecurityHeaders() });
  }
}
