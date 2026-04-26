import { createClient } from '@supabase/supabase-js';

export async function verifyAuth(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!token) return { user: null, error: 'No token' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { user: null, error: 'Server misconfigured' };

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: 'Invalid token' };

  return { user: data.user, error: null };
}

export function rateLimit() {
  const map = new Map();
  return function check(ip, limit = 20, windowMs = 60000) {
    const now = Date.now();
    const entry = map.get(ip) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      map.set(ip, { count: 1, start: now });
      return false;
    }
    entry.count++;
    map.set(ip, entry);
    return entry.count > limit;
  };
}

export const limiter = rateLimit();
