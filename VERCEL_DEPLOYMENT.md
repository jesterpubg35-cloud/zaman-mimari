# Vercel Deployment Rehberi

## 🚨 ÖNEMLİ: Vercel'de Environment Variables Set Etmeniz GEREKİYOR

### Yapılan Değişiklikler:

1. **`next.config.js` oluşturuldu** - Vercel SSR sorunlarını çözmek için
2. **`vercel.json` oluşturuldu** - Deployment ayarları için
3. **`page.js` güncellendi:**
   - `pigeon-maps` dynamic import ile yüklüyor (SSR sorunu çözüldü)
   - `@capacitor/geolocation` dynamic import ile yüklüyor (SSR sorunu çözüldü)
   - Fallback olarak browser geolocation API eklendi

---

## 🛠️ Vercel Dashboard'da Yapılması Gerekenler

### Adım 1: Vercel Dashboard'a Giriş
1. https://vercel.com/dashboard adresine git
2. Projeni seç
3. **Settings** → **Environment Variables** sekmesine git

### Adım 2: Aşağıdaki Environment Variables'ları Ekle

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tyjkwnmanagviijwjmqm.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_dSFyLYmA5rhQLF0nI2GENQ_P6Xe5UWb` | Production, Preview |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_51SQ8kLRpcq1fHdDfo1F6qF4Pa7HqA5INciLBQcVObTz7hbIQ7TsGHzDsbPxFyCXiFhNYCXdRbO9Wz6srmbsQ2sPO00YGUsCpCw` | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | `https://senin-vercel-url.vercel.app` | Production, Preview |
| `STRIPE_SECRET_KEY` | `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` | Production (Secret!) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (.env.local'dan kopyala) | Production (Secret!) |
| `STRIPE_CONNECT_CLIENT_ID` | `ca_TP0cUPLChz0zSG5zmxkdhkDJ5CkLplJeo` | Production (Secret!) |

> **Not:** `NEXT_PUBLIC_APP_URL` yerine kendi Vercel URL'nizi yazın (deployment sonrası)

### Adım 3: CLI ile Environment Variables Ekleme (Alternatif)

```bash
# Vercel CLI ile login ol
vercel login

# Client-side environment variables (NEXT_PUBLIC_*)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add NEXT_PUBLIC_APP_URL production

# Server-side secret environment variables (NEXT_PUBLIC yok!)
vercel env add STRIPE_SECRET_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_CONNECT_CLIENT_ID production
```

Her komut çalıştığında value'yu yapıştırmanız istenecek.

---

## 🚀 Deployment

### Yerel Test (Önce bunu dene)
```bash
npm run build
npm start
```

### Vercel'e Deploy
```bash
# Production deploy
vercel --prod
```

---

## ❌ Önceki Sorunlar (Çözüldü)

| Sorun | Neden | Çözüm |
|-------|-------|-------|
| Butonlar basmıyor | SSR + hydration mismatch | Dynamic imports eklendi |
| Yavaş yükleme | `next.config.js` yoktu | Config dosyaları oluşturuldu |
| Harita gelmiyor | `pigeon-maps` SSR desteklemiyordu | Lazy loading ile yüklüyor |
| "TICK" ekranında takılıyor | Auth timeout yoktu | 5 saniye timeout eklendi |

---

## 🔧 Debug İpuçları

Eğer hala sorun yaşıyorsan:

1. **Vercel Logs Kontrolü:**
   - Vercel Dashboard → Proje → Deployments → Son deployment → Functions sekmesi

2. **Browser Console:**
   - F12 → Console sekmesinde kırmızı hataları kontrol et

3. **Network Tab:**
   - Supabase istekleri 500/404 dönüyor mu?

4. **.env.local'ı .gitignore'dan kaldırma (SADECE TEST İÇİN):**
   ```bash
   # .gitignore'dan .env.local satırını sil (geçici olarak)
   # Ama bu güvenlik riski!
   ```

---

## ⚠️ Güvenlik Notu

`.env.local` dosyasındaki şu key'leri ASLA client-side'a koyma:
- `SUPABASE_SERVICE_ROLE_KEY` ❌
- `STRIPE_SECRET_KEY` ❌

Bu key'ler sadece server-side (API routes) kullanılmalı.

Şu anki durumda `page.js` sadece publishable/supabase ANON key kullanıyor, bu güvenli ✅
