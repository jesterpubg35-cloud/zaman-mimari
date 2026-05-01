import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, limiter } from '../_lib/auth';

/**
 * TRANSFER API - Race Condition Korumalı (v2.0)
 * 
 * DEĞİŞİKLİKLER:
 * - Eski manuel bakiye güncelleme KALDIRILDI
 * - atomic_transfer() RPC fonksiyonuna geçildi
 * - Veritabanı seviyesinde FOR UPDATE kilidi
 * - Çift tıklama/çift istek güvenliği
 */

// Lazy Supabase client
let supabase;
const getSupabase = () => {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase configuration missing');
    }
    supabase = createClient(url, key);
  }
  return supabase;
};

// Aktif transfer takibi (çift istek önlemi)
const activeTransfers = new Map();
const TRANSFER_LOCK_TIMEOUT = 30000; // 30 saniye

export async function POST(request) {
  let transferKey = null;
  
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (limiter(ip, 5, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { user, error: authError } = await verifyAuth(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fromUserId, toUserId, phone, amount, description } = body;

    if (!fromUserId || (!toUserId && !phone) || !amount) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    // Sadece kendi adına transfer yapabilir
    if (user.id !== fromUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Miktar sınırı - negatif veya sıfır engelle
    if (amount <= 0 || amount > 100000) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Alıcıyı bul (telefon veya userId ile)
    let receiverId = toUserId;
    if (!receiverId && phone) {
      const { data: profile, error: phoneError } = await getSupabase()
        .from('profilkisi')
        .select('user_id')
        .eq('phone', phone)
        .single();
      
      if (phoneError || !profile) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      receiverId = profile.user_id;
    }

    if (receiverId === fromUserId) {
      return NextResponse.json({ error: 'Cannot transfer to yourself' }, { status: 400 });
    }

    // ÇİFT İSTEK KORUMASI: Aynı kullanıcı+alıcı+miktar kombinasyonu aktif mi?
    transferKey = `${fromUserId}:${receiverId}:${amount}`;
    const existingTransfer = activeTransfers.get(transferKey);
    
    if (existingTransfer && (Date.now() - existingTransfer) < TRANSFER_LOCK_TIMEOUT) {
      return NextResponse.json({ 
        error: 'Transfer already in progress', 
        code: 'TRANSFER_IN_PROGRESS',
        message: 'Bu transfer zaten işleniyor, lütfen bekleyin' 
      }, { status: 409 });
    }
    
    // Transfer kilidi oluştur
    activeTransfers.set(transferKey, Date.now());

    // =================================================================
    // ATOMIC TRANSFER: Veritabanı seviyesinde kilitleme ve işlem
    // =================================================================
    const { data: result, error: rpcError } = await getSupabase()
      .rpc('atomic_transfer', {
        p_from_user_id: fromUserId,
        p_to_user_id: receiverId,
        p_amount: amount,
        p_currency: 'TRY',
        p_description: description || 'P2P Transfer'
      });

    // Transfer kilidini temizle (başarılı veya başarısız)
    activeTransfers.delete(transferKey);
    transferKey = null;

    if (rpcError) {
      console.error('Atomic transfer RPC error:', rpcError);
      return NextResponse.json({ 
        error: 'Transfer failed', 
        details: rpcError.message,
        code: 'TRANSFER_ERROR'
      }, { status: 500 });
    }

    // Sonucu kontrol et
    if (!result || !result.success) {
      return NextResponse.json({ 
        error: result?.error || 'Transfer failed',
        code: result?.code || 'UNKNOWN_ERROR',
        details: result
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      commission: result.commission,
      receiverAmount: result.receiver_amount,
      senderNewBalance: result.sender_new_balance,
      message: 'Transfer başarıyla tamamlandı'
    });

  } catch (error) {
    // Hata durumunda kilidi temizle
    if (transferKey) {
      activeTransfers.delete(transferKey);
    }
    
    console.error('Transfer error:', error);
    return NextResponse.json({ 
      error: error.message,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
