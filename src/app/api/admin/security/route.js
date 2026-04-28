import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_PANEL_KEY = process.env.ADMIN_PANEL_KEY || '';

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
    const { adminClient } = getClients(req);
    if (!adminClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ radar: radar || [] });
    }

    if (type === 'stats') {
      // Radar istatistikleri
      const { data: stats } = await adminClient.rpc('get_security_stats');
      return NextResponse.json({ stats });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Ödeme onayı/red veya yeni bildirim
export async function POST(req) {
  try {
    const { adminClient } = getClients(req);
    if (!adminClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, radar_id, admin_id, notes, cancel_job } = body;

    if (!action || !radar_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ödeme işlemi (onay/red)
    if (action === 'approve_payment' || action === 'reject_payment') {
      const { data: success, error } = await adminClient.rpc(
        'process_security_payment',
        {
          p_radar_id: radar_id,
          p_admin_id: admin_id,
          p_action: action === 'approve_payment' ? 'approve' : 'reject',
          p_notes: notes || null
        }
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // İşi iptal et seçeneği işaretliyse
      if (cancel_job && action === 'reject_payment') {
        const { data: radarData } = await adminClient
          .from('security_radar')
          .select('request_id')
          .eq('id', radar_id)
          .single();
        
        if (radarData?.request_id) {
          await adminClient
            .from('requests')
            .update({ 
              status: 'cancelled_security',
              cancelled_at: new Date().toISOString(),
              cancel_reason: 'Security violation - ' + (notes || 'Manual review')
            })
            .eq('id', radarData.request_id);
        }
      }

      return NextResponse.json({ 
        success: true, 
        action: action,
        message: action === 'approve_payment' ? 'Ödeme onaylandı' : 'Ödeme reddedildi'
      });
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
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Durum güncellendi' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
