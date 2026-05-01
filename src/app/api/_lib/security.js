/**
 * TICK Platform - Güvenlik Katmanı (Security Shield)
 * SQL Injection, XSS, Rate Limiting, Security Headers
 * @version 2.0 - Selective Manual Control
 */

import { NextResponse } from 'next/server';

// ============================================
// 1. RATE LIMITING (Brute-force koruması)
// ============================================
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 dakika
const RATE_LIMIT_MAX = 5; // IP başına 5 istek/dakika (admin işlemleri için)
const RATE_LIMIT_MAX_NORMAL = 30; // Normal API için 30 istek/dakika

export function checkRateLimit(ip, isAdmin = false) {
  const now = Date.now();
  const maxRequests = isAdmin ? RATE_LIMIT_MAX : RATE_LIMIT_MAX_NORMAL;
  
  const key = `${ip}:${isAdmin ? 'admin' : 'normal'}`;
  const record = rateLimitStore.get(key);
  
  if (!record) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (record.count >= maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

// ============================================
// 2. SQL INJECTION KORUMASI
// ============================================
const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  /((\%27)|(\'))union/i,
  /exec(\s|\+)+(s|x)p\w+/i,
  /UNION\s+SELECT/i,
  /INSERT\s+INTO/i,
  /DELETE\s+FROM/i,
  /DROP\s+TABLE/i,
  /ALTER\s+TABLE/i,
  /;/g
];

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // SQL Injection kontrolü
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      throw new Error('Potentially dangerous input detected');
    }
  }
  
  // XSS koruması - HTML tag temizleme
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Key'leri de sanitize et
    const cleanKey = typeof key === 'string' ? sanitizeInput(key) : key;
    sanitized[cleanKey] = typeof value === 'string' 
      ? sanitizeInput(value) 
      : sanitizeObject(value);
  }
  return sanitized;
}

// ============================================
// 3. GÜVENLİK BAŞLIKLARI (Security Headers)
// ============================================
export function getSecurityHeaders() {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(self)',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
  };
}

// ============================================
// 4. RUNTIME KORUMA (Immutable sabitler)
// ============================================
export const SECURITY_CONSTANTS = Object.freeze({
  // 3 dakika kuralı - saniye cinsinden
  FAST_COMPLETION_THRESHOLD: 180, // 3 dakika = 180 saniye
  
  // Severity seviyeleri
  SEVERITY: Object.freeze({
    CRITICAL: 'critical', // < 1 dakika
    HIGH: 'high',         // < 2 dakika  
    MEDIUM: 'medium',     // < 3 dakika
    LOW: 'low'            // >= 3 dakika (normal)
  }),
  
  // Rate limit ayarları
  RATE_LIMIT: Object.freeze({
    ADMIN_MAX: 5,
    NORMAL_MAX: 30,
    WINDOW_MS: 60000
  }),
  
  // Platform komisyonu
  PLATFORM_COMMISSION: 0.10,
  
  // Provider rolleri (immutable)
  PROVIDER_ROLES: Object.freeze(['kurye', 'emanetci', 'siraci', 'rehber', 'hepsi']),
  CUSTOMER_ROLE: 'musteri'
});

// ============================================
// 5. DOĞRULAMA YARDIMCILARI
// ============================================
export function validateUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function validateEmail(str) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str) && str.length <= 254;
}

export function validateAmount(amount) {
  const num = Number(amount);
  return !isNaN(num) && num > 0 && num <= 1000000 && Number.isFinite(num);
}

export function getSeverityByDuration(durationSeconds) {
  const minutes = Math.floor(durationSeconds / 60);
  if (minutes < 1) return SECURITY_CONSTANTS.SEVERITY.CRITICAL;
  if (minutes < 2) return SECURITY_CONSTANTS.SEVERITY.HIGH;
  if (minutes < 3) return SECURITY_CONSTANTS.SEVERITY.MEDIUM;
  return SECURITY_CONSTANTS.SEVERITY.LOW;
}

// ============================================
// 6. GÜVENLİK MIDDLEWARE
// ============================================
export function createSecureResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: getSecurityHeaders()
  });
}

export function createErrorResponse(message, status = 400, code = null) {
  return NextResponse.json(
    { error: message, ...(code && { code }) },
    { status, headers: getSecurityHeaders() }
  );
}

// ============================================
// 7. İSTEK DOĞRULAMA
// ============================================
export function validateRequestBody(body, requiredFields = []) {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }
  
  for (const field of requiredFields) {
    if (!(field in body) || body[field] === undefined || body[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  return sanitizeObject(body);
}

// IP adresi çıkarma
export function getClientIP(request) {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

// Admin key doğrulama
export function validateAdminKey(request) {
  const adminKey = request.headers.get('x-admin-key') || 
                   request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!adminKey || adminKey !== process.env.ADMIN_PANEL_KEY) {
    return false;
  }
  return true;
}
