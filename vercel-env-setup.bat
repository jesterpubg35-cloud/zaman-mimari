@echo off
chcp 65001 >nul
echo ==========================================
echo Vercel Environment Variables Setup
echo ==========================================
echo.
echo Her komut sonrasi DEGER girmen istenecek.
echo Kopyala-yapistir yapacaksin.
echo.
pause

echo.
echo [1/8] NEXT_PUBLIC_SUPABASE_URL ekleniyor...
vercel env add NEXT_PUBLIC_SUPABASE_URL production

echo.
echo [2/8] NEXT_PUBLIC_SUPABASE_ANON_KEY ekleniyor...
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

echo.
echo [3/8] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ekleniyor...
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

echo.
echo [4/8] NEXT_PUBLIC_APP_URL ekleniyor...
vercel env add NEXT_PUBLIC_APP_URL production

echo.
echo [5/8] STRIPE_SECRET_KEY ekleniyor (SECRET!)...
vercel env add STRIPE_SECRET_KEY production

echo.
echo [6/8] SUPABASE_SERVICE_ROLE_KEY ekleniyor (SECRET!)...
vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo.
echo [7/8] STRIPE_CONNECT_CLIENT_ID ekleniyor...
vercel env add STRIPE_CONNECT_CLIENT_ID production

echo.
echo ==========================================
echo TAMAMLANDI!
echo Simdi vercel --prod yapabilirsin.
echo ==========================================
pause
