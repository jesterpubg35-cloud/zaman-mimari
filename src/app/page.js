'use client';

// ************************************************************
// SİSTEM ŞU AN GÜNCEL - BU YAZIYI GÖRÜYORSANIZ DOĞRU DOSYADIR
// ************************************************************

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// SSR-safe dynamic imports
let PigeonMap, Marker, ZoomControl;
let Geolocation;
let libsLoaded = false;

// Lazy load libraries only on client side
const loadLibraries = async () => {
  if (libsLoaded || typeof window === 'undefined') return;
  try {
    const pigeon = await import('pigeon-maps');
    PigeonMap = pigeon.Map;
    Marker = pigeon.Marker;
    ZoomControl = pigeon.ZoomControl;
  } catch (e) {
    console.warn('Pigeon maps load failed:', e);
  }
  try {
    const cap = await import('@capacitor/geolocation');
    Geolocation = cap.Geolocation;
  } catch (e) {
    console.warn('Capacitor geolocation load failed:', e);
  }
  libsLoaded = true;
};

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tyjkwnmanagviijwjmqm.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dSFyLYmA5rhQLF0nI2GENQ_P6Xe5UWb',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
  }
);

// Simple Pigeon Maps component (no dynamic import needed)
const roleOrder = ['kurye', 'emanetci', 'siraci', 'hepsi'];
const getRoleColor = (roles) => {
  if (!roles || roles.length === 0) return '#9ca3af';
  if (roles.includes('hepsi')) return '#9333ea';
  if (roles.includes('kurye')) return '#fbbf24';
  if (roles.includes('siraci')) return '#22c55e';
  if (roles.includes('emanetci')) return '#3b82f6';
  return '#9ca3af';
};

const getPrimaryRole = (u) => {
  const roles = u?.roles || [u?.user_role];
  const order = ['kurye', 'emanetci', 'siraci', 'hepsi'];
  for (const r of order) if (roles?.includes(r)) return r;
  return 'musteri';
};


function MapView({
  lat,
  lng,
  others,
  selectedId,
  dark,
  activeJobUserIds,
  currentUser,
  onSelect,
  onProfileClick,
  heading,
  onResetRef,
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(15);
  const [center, setCenter] = useState(() => [lat || 38.411, lng || 27.158]);
  const [userModified, setUserModified] = useState(false);
  const [libsReady, setLibsReady] = useState(false);

  useEffect(() => {
    loadLibraries().then(() => setLibsReady(true));
  }, []);

  useEffect(() => {
    if (!userModified && lat && lng) {
      setCenter([lat, lng]);
    }
  }, [lat, lng, userModified]);

  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = () => {
        setUserModified(false);
        if (lat && lng) setCenter([lat, lng]);
      };
    }
  }, [onResetRef, lat, lng]);

  const effectiveCenter = center;

  const lightTileProvider = useCallback((x, y, z) => `https://mt1.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}`, []);
  const darkTileProvider = useCallback((x, y, z) => `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`, []);

  const handleMarkerClick = useCallback((user) => (params) => {
    params?.event?.stopPropagation?.();
    return onProfileClick ? onProfileClick(user) : onSelect(user);
  }, [onProfileClick, onSelect]);

  const currentUserData = currentUser || { roles: ['musteri'], user_role: 'musteri', user_id: 'self' };

  if (!libsReady || !PigeonMap) {
    return (
      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
        <div className="text-[#2ECC71] text-sm">Harita yükleniyor...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      <PigeonMap
          provider={dark ? darkTileProvider : lightTileProvider}
          center={effectiveCenter}
          zoom={zoom}
          minZoom={2}
          animate={true}
          animateMaxScreens={5}
          mouseEvents={true}
          touchEvents={true}
          twoFingerDrag={false}
          metaWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
          onBoundsChanged={({ center: newCenter, zoom: newZoom }) => {
            setUserModified(true);
            setZoom(newZoom);
            setCenter(newCenter);
          }}
          onClick={() => {}}
        >
        {/* Self marker - Direction arrow */}
        {lat && lng && (
          <Marker
            anchor={[lat, lng]}
            width={28}
            height={28}
            onClick={handleMarkerClick({ ...currentUserData, user_id: 'self', lat, lng })}
          >
            <div style={{ width: 28, height: 28, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {heading !== null && heading !== undefined && (
                <div style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderBottom: '12px solid ' + getRoleColor(currentUserData.roles),
                  top: -4,
                  left: '50%',
                  transform: `translateX(-50%) rotate(${heading}deg)`,
                  transformOrigin: '50% 200%',
                  opacity: 0.85,
                }} />
              )}
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: getRoleColor(currentUserData.roles),
                  border: '2px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  zIndex: 1,
                }}
              />
            </div>
          </Marker>
        )}
        
        {/* Other users markers - Small and centered */}
        {(others || []).map((u) => (
          <Marker
            key={`${u.user_id}-${(u.roles || [u.user_role]).join(',')}`}
            anchor={[u.lat, u.lng]}
            width={12}
            height={12}
            onClick={handleMarkerClick(u)}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getRoleColor(u.roles || [u.user_role]),
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
              }}
            />
          </Marker>
        ))}
        
        <ZoomControl />
        </PigeonMap>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="fixed inset-0 bg-[#0F0F0F] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-5xl font-black italic tracking-tighter text-[#2ECC71] transform -skew-x-12 animate-pulse">
          TICK
        </h1>
        <div className="w-8 h-1 bg-[#2ECC71]/30 rounded-full overflow-hidden">
          <div className="h-full bg-[#2ECC71] rounded-full animate-[slide_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
        </div>
      </div>
    </main>
  );
}

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  tr: {
    name: 'Türkçe', flag: '🇹🇷',
    appLogin: 'Tick hesabını oluştur', namePlaceholder: 'Adınız Soyadınız', startBtn: 'Başla',
    noName: 'Lütfen tüm alanları doldurun!', regError: 'Kayıt hatası!',
    birthDate: 'Doğum Tarihi', country: 'Ülke', city: 'Şehir',
    fullNamePlaceholder: 'Ad Soyad', birthPlaceholder: 'GG.AA.YYYY',
    countryPlaceholder: 'Ülke Yazın', cityPlaceholder: 'Şehir',
    selectRole: 'Rol Seçin', language: 'Dil',
    email: 'E-posta', phone: 'Telefon', password: 'Şifre',
    login: 'Giriş Yap', register: 'Kayıt Ol',
    emailPlaceholder: 'ornek@email.com', phonePlaceholder: '05xx xxx xx xx',
    passwordPlaceholder: '••••••',
    confirmPassword: 'Şifre (Tekrar)', confirmPasswordPlaceholder: '••••••',
    passwordsNoMatch: 'Şifreler aynı değil!',
    loginBtn: 'Giriş Yap', registerBtn: 'Kayıt Ol',
    authError: 'Giriş bilgileri hatalı!',
    loginWithPassword: 'Şifre', loginWithCode: 'E-posta Kodu', loginWithPhone: 'SMS',
    verify: 'Doğrula', codeSent: 'Kod gönderildi',
    phoneVerify: 'Telefonu Onayla',
    phoneVerified: 'Telefon onaylandı',
    phoneCodeSent: 'Telefon kodu gönderildi',
    smsWrong: 'SMS kodu yanlış!',
    smsVerifyTitle: 'SMS Doğrulama',
    smsVerifyDesc: 'Telefonuna gelen 6 haneli kodu gir.',
    forgotPassword: 'Şifremi unuttum',
    resetByEmail: 'E-posta ile', resetByPhone: 'Telefon ile',
    sendCode: 'Kod Gönder', code: 'Kod', codePlaceholder: '6 haneli kod',
    newPassword: 'Yeni Şifre', newPasswordPlaceholder: '••••••',
    savePassword: 'Şifreyi Kaydet',
    checkEmail: 'E-postanı kontrol et',
    verifyEmailHint: 'Kayıt tamamlanması için e-postana gelen link/kodu onayla.',
    searchCountry: 'Ülke ara...',
    support: 'Destek', payment: 'Ödeme', history: 'Geçmiş',
    settings: 'Ayarlar', darkTheme: 'Koyu Tema', logout: 'Çıkış Yap',
    myAccount: 'Hesabım ▶',
    fastCourier: 'HIZLI KURYE', custodian: 'EMANETÇİ', waitInLine: 'SIRA BEKLE',
    courierDesc: 'Paket taşır', custodianDesc: 'Emanet kabul eder', waitDesc: 'Sizin yerinize bekler',
    all: 'HEPSİ', allDesc: 'Tüm çalışanları gör',
    wantToWork: 'Çalışmak İstiyorum',
    selectRoles: 'Roller Seçin',
    workingAs: 'olarak çalışıyorsunuz',
    save: 'Kaydet',
    rolesSaved: 'Roller kaydedildi!',
    jobDetail: 'İş Detayı Nedir?', 
    offerPrice: 'Teklifin (₺)',
    sendJob: 'İŞİ GÖNDER 🚀', sending: 'GÖNDERİLİYOR...',
    tagline: 'tick ile her şey yakında',
    chat: 'Sohbet', call: 'Ara', completeJob: 'İşi Tamamla',
    confirmJob: 'İşi Onayla', waitingConfirm: 'Onay Bekleniyor...',
    youConfirmed: '✓ Onayladın', bothConfirmed: 'Her İki Taraf Onayladı!',
    rateTitle: 'İşi Değerlendir', commentPlaceholder: 'Yorum yaz...', submitReview: 'Gönder',
    reviewSent: 'Puanın kaydedildi!', jobCompleted: 'İş Tamamlandı!',
    msgPlaceholder: 'Mesaj yaz...', sendMsg: 'Gönder', photo: 'Fotoğraf',
    incomingRequest: 'Yeni İş Talebi!', accept: 'Kabul Et', reject: 'Reddet',
    reviews: 'Yorumlar', noReviews: 'Henüz yorum yok',
    noComment: 'Yorum yok',
    rolesSaved: 'Roller kaydedildi!',
    activeJob: 'Aktif İş', selectLang: 'Dil Seç',
    offerRejected: 'Teklifin reddedildi',
    offerExpired: 'Teklif süresi doldu',
    offerCancelled: 'Teklif iptal edildi',
    cancelOffer: 'Teklifi İptal Et',
    typing: 'yazıyor...',
    callStart: 'Sesli Arama Başlat', callEnd: 'Aramayı Bitir', callIncoming: 'Gelen Arama',
    callAccept: 'Kabul Et', callDecline: 'Reddet',
    missedCall: '📵 Cevapsız Arama',
    callFailed: 'Arama başarısız oldu, mesajlaşmaya devam edin',
    callWeak: 'Ses bağlantısı zayıf, chate geçin',
    arrived: 'Varıldı', pickedUp: 'Teslim Alındı', delivered: 'Teslim Edildi',
    stageArrived: 'Varıldı', stagePickedUp: 'Alındı', stageDelivered: 'Teslim Edildi',
    photoProof: 'Fotoğraf Kanıtı Ekle', photoRequired: 'Bu aşama için fotoğraf gerekli',
    deliveryCode: 'Teslim Kodu', enterCode: 'Kodu Girin',
    codeGenerated: 'Teslim kodu oluşturuldu', codeVerified: '✓ Kod doğrulandı',
    codeWrong: 'Yanlış kod!', verifyCode: 'Kodu Doğrula',
    priceSuggestion: 'Öneri fiyat',
    blockUser: 'Kullanıcıyı Engelle', reportUser: 'Şikayet Et',
    blocked: 'Engellendi', reported: 'Şikayet gönderildi',
    completedJobs: 'Tamamlanan İş', avgRating: 'Ort. Puan',
    userUnavailable: 'Kullanıcı şu an müsait değil',
    outOfRadius: 'Hizmet alanı dışında', userBlocked: 'Bu kullanıcıyla iletişim kurulamaz',
    supportQ1: 'Anlaştığımız kişilere nasıl güveneceğiz?',
    supportA1: 'Güvenlik süreci, tarafların beyan ettiği kimlik bilgilerinin resmi kanallar aracılığıyla teyit edilmesine dayanır. Tüm iletişim ve veri paylaşımı, izlenebilir ve doğrulanabilir platformlar üzerinden yürütülmelidir. Şeffaflık ilkesi gereği, kimlik doğrulaması tamamlanmamış taraflarla kritik işlem başlatılmaması esastır.',
    supportQ2: 'Dijital Sözleşme',
    supportA2: "İş birliğinin tüm teknik ve mali detaylarını (hizmet kapsamı, teslimat takvimi, ödeme şartları ve tarafların yükümlülükleri) kapsayan yazılı mutabakattır. Dijital ortamda onaylanan bu belgeler, uyuşmazlık durumunda başvurulacak temel yasal dayanak olup süreçlerin hukuk çerçevesinde korunmasını sağlar.",
    supportQ3: 'İşlem Öncesi Kanıt Alın',
    supportA3: 'Herhangi bir ödeme veya nihai onay aşamasından önce, sunulan hizmetin veya gerçekleştirilen işlemin doğruluğunu ispatlayan somut belgeler (işlem dekontu, çalışma görseli veya veri kayıtları) talep edilmelidir. Doğrulanabilir kanıt sunulmayan hiçbir adım üzerinden finansal transfer veya onay işlemi gerçekleştirilmez.',
    customer: 'Müşteri', emanci: 'EMANETÇİ', courier: 'KURYE', waiter: 'SIRA BEKLE',
    voiceMsg: 'Sesli Mesaj', voiceMsgSend: 'Sesli Mesaj Gönder',
    recording: 'Kayıt yapılıyor...', recordStop: 'Durdur',
    waiting: 'Bekleniyor...',
    errorOccurred: 'Hata oluştu!',
    msgNotSent: 'Mesaj gönderilemedi',
    photoUploading: '📷 Yükleniyor...',
    photoUploadError: 'Fotoğraf yüklenemedi',
    voiceUploadError: 'Ses mesajı yüklenemedi',
    onMyWay: 'Yoldayım 🚀',
    arrivedEmoji: 'Vardım ✅',
    doneEmoji: 'Tamamdır 👍',
    atLocation: 'Konumdayım 📍',
    thanksEmoji: 'Teşekkürler 🙏',
    selectRolePrompt: 'Rol Seçin',
    jobRequestFrom: 'İş Talebi: ',
    personalInfo: 'Kişisel Bilgiler',
    verified: 'Doğrulandı',
    verify: 'Doğrula',
    verifyEmail: 'E-posta Doğrula',
    enterCodeSentTo: 'Şu adrese gönderilen kodu girin:',
    openAddress: 'Açık Adres',
    enterAddress: 'Adresinizi girin...',
    saveAddress: 'Adresi Kaydet',
    addressSaved: 'Adres kaydedildi!',
    emailVerified: 'E-posta doğrulandı!',
    invalidCode: 'Geçersiz kod',
    cancel: 'İptal',
    deliveryAddress: 'Teslimat Adresi',
    addressLine1: 'Adres Satırı 1',
    addressLine2: 'Adres Satırı 2 (Opsiyonel)',
    streetAddress: 'Sokak, cadde ve bina no',
    aptSuite: 'Daire, kat, ofis vb.',
    city: 'Şehir',
    district: 'İlçe',
    neighborhood: 'Mahalle/Köy',
    postalCode: 'Posta Kodu',
    cityPlaceholder: 'Şehir adı',
    districtPlaceholder: 'İlçe/Bölge',
    neighborhoodPlaceholder: 'Mahalle',
    postalPlaceholder: '34000',
    changeEmail: 'E-posta Değiştir',
    enterNewEmail: 'Yeni e-posta adresinizi girin',
    newEmailPlaceholder: 'yeni@email.com',
    continue: 'Devam Et',
    enterCodeOldEmail: 'Mevcut e-postanıza gönderilen kodu girin:',
    enterCodeNewEmail: 'Yeni e-postanıza gönderilen kodu girin:',
    back: 'Geri',
    confirm: 'Onayla',
    photoUploaded: 'Fotoğraf yüklendi!',
    emailChanged: 'E-posta değiştirildi!',
    codeSentToOld: 'Mevcut e-postanıza kod gönderildi',
    codeSentToNew: 'Yeni e-postanıza kod gönderildi',
  },
  en: {
    name: 'English', flag: '🇬🇧',
    appLogin: 'Create your Tick account', namePlaceholder: 'Your Full Name', startBtn: 'Start',
    noName: 'Please fill all fields!', regError: 'Registration error!',
    birthDate: 'Birth Date', country: 'Country', city: 'City',
    fullNamePlaceholder: 'Full Name', birthPlaceholder: 'DD.MM.YYYY',
    countryPlaceholder: 'Type Country', cityPlaceholder: 'City',
    selectRole: 'Select Role', language: 'Language',
    email: 'Email', phone: 'Phone', password: 'Password',
    login: 'Login', register: 'Register',
    emailPlaceholder: 'example@email.com', phonePlaceholder: '+1 234 567 8900',
    passwordPlaceholder: '••••••',
    confirmPassword: 'Confirm Password', confirmPasswordPlaceholder: '••••••',
    passwordsNoMatch: 'Passwords do not match!',
    loginBtn: 'Login', registerBtn: 'Register',
    authError: 'Invalid credentials!',
    loginWithPassword: 'Password', loginWithCode: 'Email Code', loginWithPhone: 'SMS',
    verify: 'Verify', codeSent: 'Code sent',
    phoneVerify: 'Verify Phone',
    phoneVerified: 'Phone verified',
    phoneCodeSent: 'Phone code sent',
    smsWrong: 'Wrong SMS code!',
    smsVerifyTitle: 'SMS Verification',
    smsVerifyDesc: 'Enter the 6-digit code sent to your phone.',
    forgotPassword: 'Forgot password?',
    resetByEmail: 'By Email', resetByPhone: 'By Phone',
    sendCode: 'Send Code', code: 'Code', codePlaceholder: '6-digit code',
    newPassword: 'New Password', newPasswordPlaceholder: '••••••',
    savePassword: 'Save Password',
    checkEmail: 'Check your email',
    verifyEmailHint: 'Confirm the link/code sent to your email to finish sign up.',
    searchCountry: 'Search country...',
    support: 'Support', payment: 'Payment', history: 'History',
    settings: 'Settings', darkTheme: 'Dark Theme', logout: 'Logout',
    myAccount: 'My Account ▶',
    fastCourier: 'FAST COURIER', custodian: 'CUSTODIAN', waitInLine: 'WAIT IN LINE',
    courierDesc: 'Delivers packages', custodianDesc: 'Accepts deposits', waitDesc: 'Waits in line for you',
    all: 'ALL', allDesc: 'View all workers',
    wantToWork: 'I Want to Work',
    selectRoles: 'Select Roles',
    workingAs: 'working as',
    save: 'Save',
    rolesSaved: 'Roles saved!',
    jobDetail: 'Job Details?', offerPrice: 'Your Offer (₺)',
    sendJob: 'SEND JOB 🚀', sending: 'SENDING...',
    tagline: 'everything soon with tick',
    chat: 'Chat', call: 'Call', completeJob: 'Complete Job',
    confirmJob: 'Confirm Job', waitingConfirm: 'Waiting for Confirmation...',
    youConfirmed: '✓ Confirmed', bothConfirmed: '🎉 Both Parties Confirmed!',
    rateTitle: 'Rate the Job', commentPlaceholder: 'Write a comment...', submitReview: 'Submit',
    reviewSent: 'Rating saved!', jobCompleted: 'Job Completed!',
    msgPlaceholder: 'Write a message...', sendMsg: 'Send', photo: 'Photo',
    incomingRequest: 'New Job Request!', accept: 'Accept', reject: 'Reject',
    reviews: 'Reviews', noReviews: 'No reviews yet',
    noComment: 'No comment',
    rolesSaved: 'Roles saved!',
    activeJob: 'Active Job', selectLang: 'Select Language',
    offerRejected: 'Your offer was rejected',
    offerExpired: 'Offer expired', offerCancelled: 'Offer cancelled',
    cancelOffer: 'Cancel Offer',
    typing: 'typing...',
    callStart: 'Start Voice Call', callEnd: 'End Call', callIncoming: 'Incoming Call',
    callAccept: 'Accept', callDecline: 'Decline',
    missedCall: '📵 Missed Call', callFailed: 'Call failed, continue with chat', callWeak: 'Weak connection, switch to chat',
    arrived: 'Arrived', pickedUp: 'Picked Up', delivered: 'Delivered',
    stageArrived: 'Arrived', stagePickedUp: 'Picked Up', stageDelivered: 'Delivered',
    photoProof: 'Add Photo Proof', photoRequired: 'Photo required for this stage',
    deliveryCode: 'Delivery Code', enterCode: 'Enter Code',
    codeGenerated: 'Delivery code generated', codeVerified: '✓ Code verified',
    codeWrong: 'Wrong code!', verifyCode: 'Verify Code',
    priceSuggestion: 'Suggested price',
    blockUser: 'Block User', reportUser: 'Report',
    blocked: 'Blocked', reported: 'Report sent',
    completedJobs: 'Completed Jobs', avgRating: 'Avg Rating',
    userUnavailable: 'User is not available',
    outOfRadius: 'Out of service radius', userBlocked: 'Cannot contact this user',
    supportQ1: 'How do we trust the people we agree with?',
    supportA1: 'The security process is based on verifying the identity information declared by the parties through official channels. All communication and data sharing must be conducted through traceable and verifiable platforms. In accordance with the principle of transparency, no critical transactions should be initiated with parties whose identity verification has not been completed.',
    supportQ2: 'Digital Contract',
    supportA2: 'A written agreement that covers all technical and financial details of the collaboration (service scope, delivery schedule, payment terms, and obligations of the parties). These digitally approved documents serve as the fundamental legal basis in case of disputes and ensure that processes are protected within the legal framework.',
    supportQ3: 'Get Evidence Before Transaction',
    supportA3: 'Before any payment or final approval stage, concrete documents proving the accuracy of the service provided or transaction completed (transaction receipts, work images, or data records) must be requested. No financial transfer or approval process should be carried out on any step where verifiable evidence has not been provided.',
    customer: 'Customer', emanci: 'CUSTODIAN', courier: 'COURIER', waiter: 'WAIT IN LINE',
    voiceMsg: 'Voice Message', voiceMsgSend: 'Send Voice Message',
    recording: 'Recording...', recordStop: 'Stop',
    waiting: 'Waiting...',
    errorOccurred: 'Error occurred!',
    msgNotSent: 'Message not sent',
    photoUploading: '📷 Uploading...',
    photoUploadError: 'Photo upload error',
    voiceUploadError: 'Voice message upload error',
    onMyWay: 'On my way 🚀',
    arrivedEmoji: 'Arrived ✅',
    doneEmoji: 'Done 👍',
    atLocation: 'At location 📍',
    thanksEmoji: 'Thanks 🙏',
    selectRolePrompt: 'Select Role',
    jobRequestFrom: 'Job Request: ',
    personalInfo: 'Personal Information',
    verified: 'Verified',
    verify: 'Verify',
    verifyEmail: 'Verify Email',
    enterCodeSentTo: 'Enter the code sent to',
    openAddress: 'Open Address',
    enterAddress: 'Enter your address...',
    saveAddress: 'Save Address',
    addressSaved: 'Address saved!',
    emailVerified: 'Email verified!',
    invalidCode: 'Invalid code',
    cancel: 'Cancel',
    deliveryAddress: 'Delivery Address',
    addressLine1: 'Address Line 1',
    addressLine2: 'Address Line 2 (Optional)',
    streetAddress: 'Street, building number',
    aptSuite: 'Apartment, floor, office',
    city: 'City',
    district: 'District',
    neighborhood: 'Neighborhood',
    postalCode: 'Postal Code',
    cityPlaceholder: 'City name',
    districtPlaceholder: 'District/Region',
    neighborhoodPlaceholder: 'Neighborhood',
    postalPlaceholder: '10001',
    changeEmail: 'Change Email',
    enterNewEmail: 'Enter your new email address',
    newEmailPlaceholder: 'new@email.com',
    continue: 'Continue',
    enterCodeOldEmail: 'Enter code sent to current email:',
    enterCodeNewEmail: 'Enter code sent to new email:',
    back: 'Back',
    confirm: 'Confirm',
    photoUploaded: 'Photo uploaded!',
    emailChanged: 'Email changed!',
    codeSentToOld: 'Code sent to current email',
    codeSentToNew: 'Code sent to new email',
  },
  de: {
    name: 'Deutsch', flag: '🇩🇪',
    appLogin: 'Erstelle dein Tick-Konto', namePlaceholder: 'Vollständiger Name', startBtn: 'Start',
    noName: 'Bitte alle Felder ausfüllen!', regError: 'Registrierungsfehler!',
    birthDate: 'Geburtsdatum', country: 'Land',
    fullNamePlaceholder: 'Vor- und Nachname',
    countryPlaceholder: 'Land auswählen', searchCountry: 'Land suchen...',
    email: 'E-Mail', phone: 'Telefon', password: 'Passwort',
    confirmPassword: 'Passwort (Wiederholen)', passwordsNoMatch: 'Passwörter stimmen nicht überein!',
    login: 'Anmelden', register: 'Registrieren',
    emailPlaceholder: 'beispiel@email.com', phonePlaceholder: '+49 1512 3456789',
    passwordPlaceholder: '••••••', confirmPasswordPlaceholder: '••••••',
    loginBtn: 'Anmelden', registerBtn: 'Registrieren',
    authError: 'Ungültige Zugangsdaten!',
    forgotPassword: 'Passwort vergessen?',
    resetByEmail: 'Per E-Mail', resetByPhone: 'Per Telefon',
    sendCode: 'Code senden', code: 'Code', codePlaceholder: '6-stelliger Code',
    newPassword: 'Neues Passwort', newPasswordPlaceholder: '••••••',
    savePassword: 'Passwort speichern',
    checkEmail: 'E-Mail prüfen',
    verifyEmailHint: 'Bestätige den Link/Code in deiner E-Mail, um die Registrierung abzuschließen.',
    support: 'Support', payment: 'Zahlung', history: 'Verlauf',
    settings: 'Einstellungen', darkTheme: 'Dunkles Theme', logout: 'Abmelden',
    myAccount: 'Mein Konto ▶',
    fastCourier: 'EXPRESS KURIER', custodian: 'VERWALTER', waitInLine: 'WARTEN',
    courierDesc: 'Liefert Pakete', custodianDesc: 'Nimmt Verwahrung an', waitDesc: 'Wartet für dich',
    all: 'ALLE', allDesc: 'Alle Arbeiter anzeigen',
    wantToWork: 'Ich möchte arbeiten',
    selectRoles: 'Rollen auswählen',
    workingAs: 'arbeiten als',
    save: 'Speichern',
    rolesSaved: 'Rollen gespeichert!',
    jobDetail: 'Auftragsdetails?', offerPrice: 'Dein Angebot (₺)',
    sendJob: 'JOB SENDEN 🚀', sending: 'WIRD GESENDET...',
    tagline: 'bald alles mit tick',
    chat: 'Chat', call: 'Anrufen', completeJob: 'Job abschließen',
    confirmJob: 'Job bestätigen', waitingConfirm: 'Warte auf Bestätigung...',
    youConfirmed: '✓ Bestätigt', bothConfirmed: 'Beide Parteien bestätigt!',
    rateTitle: 'Job bewerten', commentPlaceholder: 'Kommentar schreiben...', submitReview: 'Senden',
    reviewSent: 'Bewertung gespeichert!', jobCompleted: 'Job abgeschlossen!',
    msgPlaceholder: 'Nachricht schreiben...', sendMsg: 'Senden', photo: 'Foto',
    incomingRequest: 'Neue Anfrage!', accept: 'Annehmen', reject: 'Ablehnen',
    reviews: 'Bewertungen', noReviews: 'Noch keine Bewertungen',
    noComment: 'Kein Kommentar',
    rolesSaved: 'Rollen gespeichert!',
    activeJob: 'Aktiver Job', selectLang: 'Sprache wählen',
    offerRejected: 'Angebot abgelehnt', offerExpired: 'Angebot abgelaufen', offerCancelled: 'Angebot abgebrochen',
    cancelOffer: 'Angebot abbrechen',
    typing: 'tippt...',
    callStart: 'Sprachanruf starten', callEnd: 'Anruf beenden', callIncoming: 'Eingehender Anruf',
    callAccept: 'Annehmen', callDecline: 'Ablehnen',
    missedCall: '📵 Verpasster Anruf', callFailed: 'Anruf fehlgeschlagen', callWeak: 'Schwache Verbindung',
    arrived: 'Angekommen', pickedUp: 'Abgeholt', delivered: 'Zugestellt',
    stageArrived: 'Angekommen', stagePickedUp: 'Abgeholt', stageDelivered: 'Zugestellt',
    photoProof: 'Foto-Nachweis hinzufügen', photoRequired: 'Foto erforderlich',
    deliveryCode: 'Liefercode', enterCode: 'Code eingeben',
    codeGenerated: 'Liefercode erstellt', codeVerified: '✓ Code bestätigt',
    codeWrong: 'Falscher Code!', verifyCode: 'Code prüfen',
    priceSuggestion: 'Preisvorschlag',
    blockUser: 'Nutzer blockieren', reportUser: 'Melden',
    blocked: 'Blockiert', reported: 'Meldung gesendet',
    completedJobs: 'Abgeschlossene Jobs', avgRating: 'Ø Bewertung',
    userUnavailable: 'Nutzer nicht verfügbar',
    outOfRadius: 'Außerhalb des Bereichs', userBlocked: 'Kontakt nicht möglich',
    supportQ1: 'Wie kann ich den vereinbarten Personen vertrauen?',
    supportA1: 'Der Sicherheitsprozess basiert auf der Überprüfung der von den Parteien angegebenen Identitätsinformationen über offizielle Kanäle. Alle Kommunikation und Datenaustausch müssen über nachvollziehbare und überprüfbare Plattformen erfolgen. Gemäß dem Transparenzprinzip sollten keine kritischen Transaktionen mit Parteien eingeleitet werden, deren Identitätsüberprüfung nicht abgeschlossen wurde.',
    supportQ2: 'Digitaler Vertrag',
    supportA2: 'Eine schriftliche Vereinbarung, die alle technischen und finanziellen Details der Zusammenarbeit abdeckt (Leistungsumfang, Lieferplan, Zahlungsbedingungen und Verpflichtungen der Parteien). Diese digital genehmigten Dokumente dienen im Streitfall als grundlegende rechtliche Grundlage und stellen sicher, dass Prozesse im rechtlichen Rahmen geschützt sind.',
    supportQ3: 'Beweise vor der Transaktion einholen',
    supportA3: 'Vor jeder Zahlungs- oder Endgenehmigungsphase müssen konkrete Dokumente angefordert werden, die die Richtigkeit der erbrachten Dienstleistung oder des durchgeführten Geschäfts nachweisen (Transaktionsbelege, Arbeitsbilder oder Datenaufzeichnungen). Kein finanzieller Transfer oder Genehmigungsprozess sollte über einen Schritt durchgeführt werden, bei dem kein überprüfbarer Beweis vorliegt.',
    customer: 'Kunde', emanci: 'VERWALTER', courier: 'KURIER', waiter: 'WARTEN',
    voiceMsg: 'Sprachnachricht', voiceMsgSend: 'Sprachnachricht senden',
    recording: 'Aufnahme...', recordStop: 'Stopp',
    waiting: 'Warten...',
    errorOccurred: 'Fehler aufgetreten!',
    msgNotSent: 'Nachricht nicht gesendet',
    photoUploading: '📷 Wird hochgeladen...', photoUploadError: 'Foto-Upload fehlgeschlagen', voiceUploadError: 'Audio-Upload fehlgeschlagen',
    onMyWay: 'Unterwegs 🚀', arrivedEmoji: 'Angekommen ✅', doneEmoji: 'Erledigt 👍', atLocation: 'Vor Ort 📍', thanksEmoji: 'Danke 🙏',
    selectRolePrompt: 'Rolle wählen',
    jobRequestFrom: 'Anfrage: ',
  },
  es: {
    name: 'Español', flag: '🇪🇸',
    appLogin: 'Crea tu cuenta Tick', namePlaceholder: 'Nombre completo', startBtn: 'Empezar',
    noName: '¡Completa todos los campos!', regError: 'Error de registro',
    birthDate: 'Fecha de nacimiento', country: 'País',
    fullNamePlaceholder: 'Nombre y apellido',
    countryPlaceholder: 'Selecciona país', searchCountry: 'Buscar país...',
    email: 'Correo', phone: 'Teléfono', password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña', passwordsNoMatch: '¡Las contraseñas no coinciden!',
    login: 'Iniciar sesión', register: 'Registrarse',
    emailPlaceholder: 'ejemplo@email.com', phonePlaceholder: '+34 612 345 678',
    passwordPlaceholder: '••••••', confirmPasswordPlaceholder: '••••••',
    loginBtn: 'Entrar', registerBtn: 'Registrarse',
    authError: 'Credenciales inválidas',
    forgotPassword: '¿Olvidaste tu contraseña?',
    resetByEmail: 'Por correo', resetByPhone: 'Por teléfono',
    sendCode: 'Enviar código', code: 'Código', codePlaceholder: 'Código de 6 dígitos',
    newPassword: 'Nueva contraseña', newPasswordPlaceholder: '••••••',
    savePassword: 'Guardar contraseña',
    checkEmail: 'Revisa tu correo',
    verifyEmailHint: 'Confirma el enlace/código enviado a tu correo para completar el registro.',
    support: 'Soporte', payment: 'Pago', history: 'Historial',
    settings: 'Ajustes', darkTheme: 'Tema oscuro', logout: 'Salir',
    myAccount: 'Mi cuenta ▶',
    fastCourier: 'MENSAJERÍA RÁPIDA', custodian: 'CUSTODIO', waitInLine: 'ESPERAR',
    courierDesc: 'Entrega paquetes', custodianDesc: 'Acepta depósitos', waitDesc: 'Espera por ti',
    all: 'TODOS', allDesc: 'Ver todos los trabajadores',
    wantToWork: 'Quiero trabajar',
    selectRoles: 'Seleccionar roles',
    workingAs: 'trabajando como',
    save: 'Guardar',
    rolesSaved: '¡Roles guardados!',
    jobDetail: '¿Detalle del trabajo?', offerPrice: 'Tu oferta (₺)',
    sendJob: 'ENVIAR TRABAJO 🚀', sending: 'ENVIANDO...',
    tagline: 'todo pronto con tick',
    chat: 'Chat', call: 'Llamar', completeJob: 'Completar',
    confirmJob: 'Confirmar', waitingConfirm: 'Esperando confirmación...',
    youConfirmed: '✓ Confirmado', bothConfirmed: '¡Ambos confirmaron!',
    rateTitle: 'Calificar', commentPlaceholder: 'Escribe un comentario...', submitReview: 'Enviar',
    reviewSent: '¡Calificación guardada!', jobCompleted: '¡Trabajo completado!',
    msgPlaceholder: 'Escribe un mensaje...', sendMsg: 'Enviar', photo: 'Foto',
    incomingRequest: '¡Nueva solicitud!', accept: 'Aceptar', reject: 'Rechazar',
    reviews: 'Reseñas', noReviews: 'Sin reseñas aún',
    noComment: 'Sin comentario',
    rolesSaved: '¡Roles guardados!',
    activeJob: 'Trabajo activo', selectLang: 'Elegir idioma',
    offerRejected: 'Oferta rechazada', offerExpired: 'Oferta expirada', offerCancelled: 'Oferta cancelada',
    cancelOffer: 'Cancelar oferta',
    typing: 'escribiendo...',
    callStart: 'Iniciar llamada', callEnd: 'Finalizar llamada', callIncoming: 'Llamada entrante',
    callAccept: 'Aceptar', callDecline: 'Rechazar',
    missedCall: '📵 Llamada perdida', callFailed: 'Llamada fallida', callWeak: 'Conexión débil',
    arrived: 'Llegó', pickedUp: 'Recogido', delivered: 'Entregado',
    stageArrived: 'Llegó', stagePickedUp: 'Recogido', stageDelivered: 'Entregado',
    photoProof: 'Añadir prueba', photoRequired: 'Foto requerida',
    deliveryCode: 'Código', enterCode: 'Ingresa código',
    codeGenerated: 'Código generado', codeVerified: '✓ Código verificado',
    codeWrong: '¡Código incorrecto!', verifyCode: 'Verificar',
    priceSuggestion: 'Precio sugerido',
    blockUser: 'Bloquear usuario', reportUser: 'Reportar',
    blocked: 'Bloqueado', reported: 'Reporte enviado',
    completedJobs: 'Trabajos completados', avgRating: 'Promedio',
    userUnavailable: 'Usuario no disponible',
    outOfRadius: 'Fuera de rango', userBlocked: 'No se puede contactar',
    supportQ1: '¿Cómo confiar en las personas con las que acordamos?',
    supportA1: 'El proceso de seguridad se basa en la verificación de la información de identidad declarada por las partes a través de canales oficiales. Toda comunicación e intercambio de datos debe realizarse a través de plataformas rastreables y verificables. De acuerdo con el principio de transparencia, no se deben iniciar transacciones críticas con partes cuya verificación de identidad no se haya completado.',
    supportQ2: 'Contrato Digital',
    supportA2: 'Un acuerdo escrito que cubre todos los detalles técnicos y financieros de la colaboración (alcance del servicio, calendario de entrega, términos de pago y obligaciones de las partes). Estos documentos aprobados digitalmente sirven como base legal fundamental en caso de disputa y aseguran que los procesos estén protegidos dentro del marco legal.',
    supportQ3: 'Obtener Evidencia Antes de la Transacción',
    supportA3: 'Antes de cualquier etapa de pago o aprobación final, se deben solicitar documentos concretos que prueben la exactitud del servicio proporcionado o la transacción completada (recibos de transacción, imágenes del trabajo o registros de datos). No se debe realizar ninguna transferencia financiera o proceso de aprobación en ningún paso donde no se haya proporcionado evidencia verificable.',
    customer: 'Cliente', emanci: 'CUSTODIO', courier: 'MENSAJERO', waiter: 'ESPERAR',
    voiceMsg: 'Mensaje de voz', voiceMsgSend: 'Enviar voz',
    recording: 'Grabando...', recordStop: 'Detener',
    waiting: 'Esperando...',
    errorOccurred: '¡Ocurrió un error!',
    msgNotSent: 'Mensaje no enviado',
    photoUploading: '📷 Subiendo...', photoUploadError: 'Error al subir foto', voiceUploadError: 'Error al subir audio',
    onMyWay: 'Voy 🚀', arrivedEmoji: 'Llegué ✅', doneEmoji: 'Listo 👍', atLocation: 'En ubicación 📍', thanksEmoji: 'Gracias 🙏',
    selectRolePrompt: 'Seleccionar rol',
    jobRequestFrom: 'Solicitud: ',
  },
  fr: {
    name: 'Français', flag: '🇫🇷',
    appLogin: 'Créer votre compte Tick',
    supportQ1: 'Comment faire confiance aux personnes avec qui nous nous mettons d\'accord?',
    supportA1: 'Le processus de sécurité repose sur la vérification des informations d\'identité déclarées par les parties via des canaux officiels. Toute communication et partage de données doivent être effectués via des plateformes traçables et vérifiables. Conformément au principe de transparence, aucune transaction critique ne doit être initiée avec des parties dont la vérification d\'identité n\'est pas terminée.',
    supportQ2: 'Contrat Numérique',
    supportA2: 'Un accord écrit couvrant tous les détails techniques et financiers de la collaboration (portée du service, calendrier de livraison, conditions de paiement et obligations des parties). Ces documents approuvés numériquement servent de base juridique fondamentale en cas de litige et garantissent que les processus sont protégés dans le cadre juridique.',
    supportQ3: 'Obtenir des Preuves Avant la Transaction',
    supportA3: 'Avant toute étape de paiement ou d\'approbation finale, des documents concrets prouvant l\'exactitude du service fourni ou de la transaction effectuée (reçus de transaction, images de travail ou enregistrements de données) doivent être demandés. Aucun transfert financier ou processus d\'approbation ne doit être effectué à une étape où aucune preuve vérifiable n\'a été fournie.',
  },
  it: {
    name: 'Italiano', flag: '🇮🇹',
    appLogin: 'Crea il tuo account Tick',
    supportQ1: 'Come fidarsi delle persone con cui ci accordiamo?',
    supportA1: 'Il processo di sicurezza si basa sulla verifica delle informazioni di identità dichiarate dalle parti attraverso canali ufficiali. Tutte le comunicazioni e la condivisione dei dati devono essere condotte attraverso piattaforme rintracciabili e verificabili. In conformità con il principio di trasparenza, non devono essere avviate transazioni critiche con parti la cui verifica dell\'identità non è stata completata.',
    supportQ2: 'Contratto Digitale',
    supportA2: 'Un accordo scritto che copre tutti i dettagli tecnici e finanziari della collaborazione (ambito del servizio, calendario di consegna, termini di pagamento e obblighi delle parti). Questi documenti approvati digitalmente servono come base legale fondamentale in caso di controversia e assicurano che i processi siano protetti all\'interno del quadro legale.',
    supportQ3: 'Ottenere Prove Prima della Transazione',
    supportA3: 'Prima di qualsiasi fase di pagamento o approvazione finale, devono essere richiesti documenti concreti che dimostrino l\'accuratezza del servizio fornito o della transazione completata (ricevute di transazione, immagini del lavoro o registrazioni di dati). Nessun trasferimento finanziario o processo di approvazione deve essere effettuato in alcuna fase in cui non sia stata fornita prova verificabile.',
  },
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const HIZMETLER = {
  musteri: { id: 'musteri', emoji: '👤' },
  emanetci: { id: 'emanetci', emoji: '💼' },
  kurye: { id: 'kurye', emoji: '📦' },
  siraci: { id: 'siraci', emoji: '⏳' },
  hepsi: { id: 'hepsi', emoji: '🌍' },
};

const PRICE_PER_KM = { kurye: 15, emanetci: 10, siraci: 8, musteri: 5 };
const BASE_PRICE = { kurye: 30, emanetci: 20, siraci: 15, musteri: 10 };

const OFFER_TIMEOUT_MS = 5 * 60 * 1000;
const LOCATION_STALE_MS = 30 * 60 * 1000; // 30 dakika - kullanıcılar arka planda da bir süre görünsün
const DEFAULT_SERVICE_RADIUS_M = 10000;

const CHAT_BUCKET = 'chat-images';
const PROOF_BUCKET = 'proof-images';

const ACTIVE_STATUSES = ['accepted', 'arrived', 'picked_up', 'delivered'];
const isActiveReq = (r) => ACTIVE_STATUSES.includes(r.status) && (r.active_job !== false);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateDeliveryCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function calcSuggestedPrice(distanceM, role) {
  const km = distanceM / 1000;
  return Math.round((BASE_PRICE[role] || 10) + km * (PRICE_PER_KM[role] || 10));
}

function isLocationFresh(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < LOCATION_STALE_MS;
}

function normalizeRolesValue(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    // fallback: comma-separated
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  return null;
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Toast({ msg, onClose, dark }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl
      ${dark ? 'bg-white/10 text-white backdrop-blur-md border border-white/10' : 'bg-black/80 text-white'}`}>
      {msg}
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-2 justify-center my-3">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} onClick={() => onChange(s)} className="text-3xl transition-transform hover:scale-125">
          {s <= value ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}

function Accordion({ title, children, dark }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl overflow-hidden mb-3 ${dark ? 'bg-white/5' : 'bg-black/5'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center p-4 text-left">
        <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-black'}`}>{title}</span>
        <span className={`text-lg transition-transform duration-300 ${open ? 'rotate-45' : ''} ${dark ? 'text-white' : 'text-black'}`}>+</span>
      </button>
      {open && (
        <div className={`px-4 pb-4 text-xs leading-relaxed whitespace-pre-line ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

function JobStageBar({ stage, dark, t }) {
  const stages = ['accepted', 'arrived', 'picked_up', 'delivered', 'completed'];
  const labels = [t.activeJob, t.stageArrived, t.stagePickedUp, t.stageDelivered, t.jobCompleted];
  const idx = stages.indexOf(stage);
  return (
    <div className="flex items-center gap-1 py-2 px-4 overflow-x-auto">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i <= idx ? 'bg-[#2ECC71]' : dark ? 'bg-white/20' : 'bg-black/20'}`} />
          <span className={`text-[9px] font-bold flex-shrink-0 ${i === idx ? 'text-[#2ECC71]' : dark ? 'text-white/40' : 'text-black/40'}`}>
            {labels[i]}
          </span>
          {i < stages.length - 1 && <div className={`w-3 h-px flex-shrink-0 ${i < idx ? 'bg-[#2ECC71]' : dark ? 'bg-white/20' : 'bg-black/20'}`} />}
        </div>
      ))}
    </div>
  );
}

function OfferCountdown({ createdAt, dark }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const calc = () => {
      const elapsed = Date.now() - new Date(createdAt).getTime();
      setRemaining(Math.max(0, Math.floor((OFFER_TIMEOUT_MS - elapsed) / 1000)));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = (remaining / (OFFER_TIMEOUT_MS / 1000)) * 100;
  return (
    <div className="mt-2">
      <div className={`w-full h-1 rounded-full ${dark ? 'bg-white/10' : 'bg-black/10'} mb-1`}>
        <div className="h-1 rounded-full bg-[#2ECC71] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-[10px] font-bold text-right ${remaining < 60 ? 'text-red-400' : dark ? 'text-white/40' : 'text-black/40'}`}>
        {mins}:{secs.toString().padStart(2, '0')}
      </p>
    </div>
  );
}

// ─── VOICE MESSAGE RECORDER ───────────────────────────────────────────────────
function VoiceMsgRecorder({ onSend, dark, t }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onSend(blob);
        stream.getTracks().forEach(tr => tr.stop());
        setDuration(0);
      };
      mr.start();
      setRecording(true);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {}
  };

  const stop = () => {
    mrRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return recording ? (
    <button onClick={stop} className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-xl text-xs font-bold animate-pulse">
      🔴 {duration}s {t.recordStop}
    </button>
  ) : (
    <button onClick={start} className={`p-3 rounded-xl text-lg ${dark ? 'bg-white/5' : 'bg-gray-100'}`} title={t.voiceMsg}>
      🎙️
    </button>
  );
}

// ─── WEBRTC VOICE CALL MANAGER ────────────────────────────────────────────────
class VoiceCallManager {
  constructor(supabaseClient, userId, requestId, onStateChange) {
    this.sb = supabaseClient;
    this.userId = userId;
    this.requestId = requestId;
    this.onStateChange = onStateChange;
    this.pc = null;
    this.localStream = null;
    this.channel = null;
    this.state = 'idle';
    this.destroyed = false;
  }

  setState(s, payload) {
    if (this.destroyed) return;
    this.state = s;
    this.onStateChange(s, payload);
  }

  async startCall(remoteUserId) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.pc = this._createPC();
      this.localStream.getTracks().forEach(tr => this.pc.addTrack(tr, this.localStream));
      this._subscribeSignaling();
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this._sendSignal({ type: 'offer', sdp: offer.sdp, from: this.userId, to: remoteUserId });
      this.setState('calling');
    } catch (err) {
      console.error('Call start error:', err);
      this.setState('failed');
    }
  }

  async acceptCall(offer, from) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.pc = this._createPC();
      this.localStream.getTracks().forEach(tr => this.pc.addTrack(tr, this.localStream));
      this._subscribeSignaling();
      await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offer }));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this._sendSignal({ type: 'answer', sdp: answer.sdp, from: this.userId, to: from });
      this.setState('connected');
    } catch (err) {
      console.error('Call accept error:', err);
      this.setState('failed');
    }
  }

  endCall() {
    try { this.pc?.close(); } catch {}
    try { this.localStream?.getTracks().forEach(tr => tr.stop()); } catch {}
    if (this.channel) { try { this.sb.removeChannel(this.channel); } catch {} }
    this.pc = null; this.localStream = null; this.channel = null;
    this.setState('ended');
  }

  destroy() {
    this.destroyed = true;
    this.endCall();
  }

  _createPC() {
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ] 
    });
    pc.ontrack = (ev) => {
      const audio = document.getElementById('radar-remote-audio');
      if (audio) { 
        if (!audio.srcObject) audio.srcObject = new MediaStream();
        audio.srcObject.addTrack(ev.track);
        audio.play().catch(() => {
          // Bazı tarayıcılar etkileşim bekler, ses ikonuna tıklatarak çözebiliriz
          console.log("Audio play deferred or blocked");
        }); 
      }
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) this._sendSignal({ type: 'ice', candidate: ev.candidate.toJSON(), from: this.userId });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') this.setState('connected');
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') this.setState('weak');
    };
    return pc;
  }

  _subscribeSignaling() {
    if (this.channel) return;
    this.channel = this.sb
      .channel(`call-signal-${this.requestId}`)
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (this.destroyed) return;
        if (!payload || payload.to !== this.userId) return;
        if (payload.type === 'answer' && this.pc) {
          await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: payload.sdp }));
          this.setState('connected');
        } else if (payload.type === 'ice' && this.pc) {
          try { await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
        } else if (payload.type === 'offer') {
          this.onStateChange('incoming', payload);
        } else if (payload.type === 'hangup') {
          this.endCall();
        } else if (payload.type === 'decline') {
          this.onStateChange('missed');
          this.endCall();
        }
      })
      .subscribe((status, error) => {
        console.log(`Call channel status for ${this.requestId}:`, status);
        if (error) console.error(`Call channel error:`, error);
      });
  }

  async _sendSignal(data) {
    if (!this.channel) this._subscribeSignaling();
    await this.channel?.send({ type: 'broadcast', event: 'signal', payload: data });
  }
}

const COUNTRIES = [
  { name: 'Türkiye', code: 'TR', lang: 'tr', flag: '🇹🇷' },
  { name: 'United Kingdom', code: 'GB', lang: 'en', flag: '🇬🇧' },
  { name: 'United States', code: 'US', lang: 'en', flag: '🇺🇸' },
  { name: 'Germany', code: 'DE', lang: 'de', flag: '🇩🇪' },
  { name: 'France', code: 'FR', lang: 'fr', flag: '🇫🇷' },
  { name: 'Italy', code: 'IT', lang: 'it', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', lang: 'es', flag: '🇪🇸' },
  { name: 'Russia', code: 'RU', lang: 'en', flag: '🇷🇺' },
  { name: 'Japan', code: 'JP', lang: 'en', flag: '🇯🇵' },
  { name: 'China', code: 'CN', lang: 'en', flag: '🇨🇳' },
  { name: 'Brazil', code: 'BR', lang: 'en', flag: '🇧🇷' },
  { name: 'Canada', code: 'CA', lang: 'en', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', lang: 'en', flag: '🇦🇺' },
];

const PHONE_COUNTRIES = [
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷', dial: '+90', example: '(537) 886 81 59' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49', example: '1512 3456789' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dial: '+34', example: '612 345 678' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33', example: '6 12 34 56 78' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dial: '+39', example: '312 345 6789' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44', example: '7400 123456' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1', example: '(201) 555-0123' },
];

function CountrySelector({ value, onChange, onLangChange, dark, t }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setOpen(!open)}
        className={`w-full p-4 rounded-2xl border border-transparent cursor-pointer transition-all flex justify-between items-center ${dark ? 'bg-white/5 text-white' : 'bg-black/5 text-black'} ${open ? 'border-[#2ECC71]' : ''}`}
      >
        <span className="text-sm">{value || t.countryPlaceholder}</span>
        <span className="text-xs opacity-40">▼</span>
      </div>
      
      {open && (
        <div className={`absolute bottom-full mb-2 left-0 right-0 z-[10000] rounded-2xl shadow-2xl overflow-hidden border border-white/5 p-2 animate-in slide-in-from-bottom-2 duration-200 ${dark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
          <input 
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchCountry}
            className={`w-full p-3 mb-2 rounded-xl outline-none text-xs ${dark ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}
          />
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {filtered.map(c => (
              <div 
                key={c.code}
                onClick={() => {
                  onChange(c.name);
                  onLangChange(c.lang);
                  setOpen(false);
                  setSearch('');
                }}
                className={`p-3 rounded-xl text-xs cursor-pointer flex items-center gap-3 transition-colors ${dark ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-black'}`}
              >
                <span>{c.flag}</span>
                <span className="font-bold">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhoneSelector({ value, onChange, dark, t }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = PHONE_COUNTRIES.filter(c =>
    (c.name + ' ' + c.dial).toLowerCase().includes(search.toLowerCase())
  );
  const selected = PHONE_COUNTRIES.find(c => c.dial === value) || PHONE_COUNTRIES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`h-full px-3 rounded-l-2xl border border-transparent flex items-center gap-2 ${dark ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}
      >
        <span>{selected.flag}</span>
        <span className="text-xs font-black">{selected.dial}</span>
        <span className="text-[10px] opacity-40">▼</span>
      </button>

      {open && (
        <div className={`absolute top-full mt-2 left-0 z-[10000] w-72 rounded-2xl shadow-2xl overflow-hidden border border-white/5 p-2 ${dark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchCountry}
            className={`w-full p-3 mb-2 rounded-xl outline-none text-xs ${dark ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}
          />
          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {filtered.map(c => (
              <div
                key={c.code}
                onClick={() => {
                  onChange(c.dial);
                  setOpen(false);
                  setSearch('');
                }}
                className={`p-3 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors ${dark ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-black'}`}
              >
                <div className="flex items-center gap-3">
                  <span>{c.flag}</span>
                  <span className="font-bold">{c.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-black">{c.dial}</div>
                  <div className="text-[10px] opacity-50">{c.example}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ isDarkMode, onClose, supabase }) {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async (type) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = type === 'transactions' ? '/api/admin/users?type=transactions' : '/api/admin/users';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const data = await res.json();
      if (type === 'transactions') setTransactions(data.transactions || []);
      else setUsers(data.users || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(tab); }, [tab]);

  const handleBan = async (userId, isBanned) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action: isBanned ? 'unban' : 'ban', targetUserId: userId })
    });
    fetchData('users');
  };

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const bg = isDarkMode ? 'bg-[#0F0F0F]' : 'bg-zinc-100';
  const text = isDarkMode ? 'text-white' : 'text-black';
  const card = isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10';

  return (
    <div className={`fixed inset-0 z-[6000] flex flex-col ${bg}`}>
      <div className={`flex items-center gap-4 p-6 pt-12 border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
        <button onClick={onClose} className={`text-2xl ${text}`}>←</button>
        <h2 className={`font-black text-xl uppercase ${text}`}>🛡 Admin Paneli</h2>
        <div className="ml-auto flex gap-2">
          {['users', 'transactions'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-red-500 text-white' : isDarkMode ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}>
              {t === 'users' ? 'Kullanıcılar' : 'İşlemler'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'users' && (
        <div className="px-4 pt-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="İsim veya email ara..."
            className={`w-full p-3 rounded-xl text-sm outline-none border mb-4 ${isDarkMode ? 'bg-white/10 text-white border-white/10 placeholder-gray-500' : 'bg-white text-black border-black/20'}`} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full"></div>
          </div>
        ) : tab === 'users' ? (
          <div className="space-y-3">
            <p className={`text-xs opacity-50 mb-2 ${text}`}>Toplam: {filteredUsers.length} kullanıcı</p>
            {filteredUsers.map(u => (
              <div key={u.user_id} className={`rounded-2xl p-4 border ${card} ${u.is_banned ? 'border-red-500/30' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-bold text-sm ${text}`}>{u.name || 'İsimsiz'}</p>
                      {u.is_admin && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">ADMIN</span>}
                      {u.is_banned && <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-bold">BANLANDI</span>}
                    </div>
                    <p className="text-[11px] opacity-50 truncate">{u.email}</p>
                    <p className="text-[10px] opacity-40">{u.phone || '-'} • {new Date(u.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                  {!u.is_admin && (
                    <button onClick={() => handleBan(u.user_id, u.is_banned)}
                      className={`ml-3 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 ${u.is_banned ? 'bg-[#2ECC71]/20 text-[#2ECC71]' : 'bg-red-500/20 text-red-400'}`}>
                      {u.is_banned ? 'Banı Kaldır' : 'Banla'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className={`text-xs opacity-50 mb-2 ${text}`}>Son 200 işlem</p>
            {transactions.map((tx, i) => (
              <div key={i} className={`rounded-2xl p-4 border ${card}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${tx.type === 'deposit' ? 'text-[#2ECC71]' : 'text-red-400'}`}>{tx.type === 'deposit' ? '↓' : '↑'}</span>
                      <p className={`font-bold text-sm ${text}`}>{tx.profilkisi?.name || 'Kullanıcı'}</p>
                    </div>
                    <p className="text-[10px] opacity-50">{tx.description || '-'} • {new Date(tx.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <p className={`font-black text-base ${tx.type === 'deposit' ? 'text-[#2ECC71]' : 'text-red-400'}`}>
                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount}₺
                  </p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && <p className={`text-sm opacity-50 text-center py-10 ${text}`}>Henüz işlem yok.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function Home() {
  const [mounted] = useState(true);
  const [lang, setLang] = useState(() => {
    try {
      if (typeof window === 'undefined') return 'tr';
      const savedLang = localStorage.getItem('radar_lang');
      return savedLang && TRANSLATIONS[savedLang] ? savedLang : 'tr';
    } catch {
      return 'tr';
    }
  });
  const t = useMemo(() => ({ ...(TRANSLATIONS.en || {}), ...(TRANSLATIONS[lang] || {}) }), [lang]);

  const [user, setUser] = useState(() => {
    try {
      if (typeof window === 'undefined') return null;
      const saved = localStorage.getItem('radar_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return parsed?.id ? parsed : null;
    } catch { return null; }
  });
  const [isLoginView, setIsLoginView] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempPhoneDial, setTempPhoneDial] = useState('+90');
  const [tempPhone, setTempPhone] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loginOtpMode, setLoginOtpMode] = useState(false);
  const [loginPhoneMode, setLoginPhoneMode] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginSmsCode, setLoginSmsCode] = useState('');
  const [loginSmsSent, setLoginSmsSent] = useState(false);
  const [tempPasswordConfirm, setTempPasswordConfirm] = useState('');
  const [tempBirthDate, setTempBirthDate] = useState('');
  const [tempCountry, setTempCountry] = useState('Türkiye');
  const [tempRole, setTempRole] = useState('musteri');
  const [pendingSignupEmail, setPendingSignupEmail] = useState(null);
  const [pendingAuthUser, setPendingAuthUser] = useState(null);
  const [pendingPhoneE164, setPendingPhoneE164] = useState('');
  const [emailVerifyCode, setEmailVerifyCode] = useState('');
  const [emailVerifyOpen, setEmailVerifyOpen] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [emailVerified, setEmailVerified] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      const savedUser = localStorage.getItem('radar_user');
      if (!savedUser) return false;
      const parsedUser = JSON.parse(savedUser);
      return Boolean(parsedUser?.email_verified);
    } catch {
      return false;
    }
  });
  const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false);
  const [profileEditLoading, setProfileEditLoading] = useState(false);
  
  // Adres alanları
  const [addressLine1, setAddressLine1] = useState(() => {
    try {
      if (typeof window === 'undefined') return '';
      const savedUser = localStorage.getItem('radar_user');
      if (!savedUser) return '';
      const parsedUser = JSON.parse(savedUser);
      return parsedUser?.address_line1 || '';
    } catch {
      return '';
    }
  });
  const [addressLine2, setAddressLine2] = useState(() => {
    try {
      if (typeof window === 'undefined') return '';
      const savedUser = localStorage.getItem('radar_user');
      if (!savedUser) return '';
      const parsedUser = JSON.parse(savedUser);
      return parsedUser?.address_line2 || '';
    } catch {
      return '';
    }
  });
  const [addressCity, setAddressCity] = useState(() => {
    try {
      if (typeof window === 'undefined') return '';
      const savedUser = localStorage.getItem('radar_user');
      if (!savedUser) return '';
      const parsedUser = JSON.parse(savedUser);
      return parsedUser?.city || '';
    } catch {
      return '';
    }
  });
  const [addressDistrict, setAddressDistrict] = useState(() => {
    try {
      if (typeof window === 'undefined') return '';
      const savedUser = localStorage.getItem('radar_user');
      if (!savedUser) return '';
      const parsedUser = JSON.parse(savedUser);
      return parsedUser?.district || '';
    } catch {
      return '';
    }
  });
  const [addressNeighborhood, setAddressNeighborhood] = useState(() => {
    try {
      if (typeof window === 'undefined') return '';
      const savedUser = localStorage.getItem('radar_user');
      if (!savedUser) return '';
      const parsedUser = JSON.parse(savedUser);
      return parsedUser?.neighborhood || '';
    } catch {
      return '';
    }
  });
  const [addressPostalCode, setAddressPostalCode] = useState(() => {
    try {
      if (typeof window === 'undefined') return '';
      const savedUser = localStorage.getItem('radar_user');
      if (!savedUser) return '';
      const parsedUser = JSON.parse(savedUser);
      return parsedUser?.postal_code || '';
    } catch {
      return '';
    }
  });
  
  // Email değiştirme
  const [newEmail, setNewEmail] = useState('');
  const [oldEmailCode, setOldEmailCode] = useState('');
  const [newEmailCode, setNewEmailCode] = useState('');
  const [emailChangeStep, setEmailChangeStep] = useState('verify-old');
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  
  // Profil fotoğrafı
  const profilePhotoInputRef = useRef(null);
  
  // Çoklu rol seçimi
  const [selectedRoles, setSelectedRoles] = useState(() => {
    try {
      if (typeof window === 'undefined') return [];
      const savedUser = localStorage.getItem('radar_user');
      if (!savedUser) return [];
      const parsedUser = JSON.parse(savedUser);
      return Array.isArray(parsedUser?.roles) ? parsedUser.roles : [];
    } catch {
      return [];
    }
  });
  const [tempSelectedRoles, setTempSelectedRoles] = useState(() => {
    try {
      if (typeof window === 'undefined') return [];
      const savedUser = localStorage.getItem('radar_user');
      if (!savedUser) return [];
      const parsedUser = JSON.parse(savedUser);
      return Array.isArray(parsedUser?.roles) ? parsedUser.roles : [];
    } catch {
      return [];
    }
  });
  const phoneVerifyStage = 'idle'; // deprecated
  const phoneVerifyCode = ''; // deprecated  
  const phoneVerifyOpen = false; // deprecated
  const [resetOpen, setResetOpen] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      const hash = window.location.hash || '';
      return hash.includes('type=recovery') && hash.includes('access_token');
    } catch {
      return false;
    }
  });
  const setPhoneVerifyOpen = () => {}; // deprecated
  const [resetTarget, setResetTarget] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetUsePhone, setResetUsePhone] = useState(false);
  const [resetPhoneDial, setResetPhoneDial] = useState('+90');
  const [resetPhone, setResetPhone] = useState('');
  const [resetPhoneCode, setResetPhoneCode] = useState('');
  const [resetPhoneSent, setResetPhoneSent] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      const hash = window.location.hash || '';
      return hash.includes('type=recovery') && hash.includes('access_token');
    } catch {
      return false;
    }
  });
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [konum, setKonum] = useState(null);
  const [heading, setHeading] = useState(null);
  const [digerleri, setDigerleri] = useState([]);
  const digerleriRef = useRef([]);
  const [aktifPage, setAktifPage] = useState('map');
  const [sheetYukseklik, setSheetYukseklik] = useState(0);
  const [aktifFiltre, setAktifFiltre] = useState('hepsi');
  const [seciliKisi, setSeciliKisi] = useState(null);
  const [talepGonderiliyor, setTalepGonderiliyor] = useState(false);
  const [isDetayi, setIsDetayi] = useState('');
  const [teklifFiyat, setTeklifFiyat] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [gelenTalep, setGelenTalep] = useState(null);
  const [aktifIs, setAktifIs] = useState(null);
  const [sentRequestId, setSentRequestId] = useState(null);
  const sentRequestIdRef = useRef(null);
  const [chatAcik, setChatAcik] = useState(false);
  const [mesajlar, setMesajlar] = useState([]);
  const [yeniMesaj, setYeniMesaj] = useState('');
  const [mesajGonderiliyor, setMesajGonderiliyor] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [karsiYaziyor, setKarsiYaziyor] = useState(false);
  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const proofFileInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingBroadcastTimerRef = useRef(null);
  const [reviewAcik, setReviewAcik] = useState(false);
  const [reviewPuan, setReviewPuan] = useState(5);
  const [reviewYorum, setReviewYorum] = useState('');
  const [reviewHedef, setReviewHedef] = useState(null);

  const [profilKisi, setProfilKisi] = useState(null);
  const [profilReviews, setProfilReviews] = useState([]);
  const [profilStats, setProfilStats] = useState({ avg: '0', count: 0, jobCount: 0 });
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Değerlendirme sistemi
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // İşlem geçmişi state'leri
  const [userHistory, setUserHistory] = useState({ transactions: [], completedJobs: [] });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Ödeme state'leri
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('TRY'); // TRY, USD, EUR, GBP
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferCurrency, setTransferCurrency] = useState('TRY');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferUserId, setTransferUserId] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Hizmet Veren (Provider) state'leri
  const [isProvider, setIsProvider] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [providerEarnings, setProviderEarnings] = useState(0);
  const [providerLoading, setProviderLoading] = useState(false);

  const [langMenuAcik, setLangMenuAcik] = useState(false);
  const [toast, setToast] = useState(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      if (!('Notification' in window)) return false;
      return Notification.permission === 'default';
    } catch {
      return false;
    }
  });

  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [authUid, setAuthUid] = useState(null);
  const [authSessionOk, setAuthSessionOk] = useState(false);
  // localStorage'da kullanici varsa hemen true - loading ekrani gozukmesin
  const [authInitialized, setAuthInitialized] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      const saved = localStorage.getItem('radar_user');
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      return Boolean(parsed?.id);
    } catch { return false; }
  });

  useEffect(() => {
    digerleriRef.current = Array.isArray(digerleri) ? digerleri : [];
  }, [digerleri]);



  const [callState, setCallState] = useState('idle');
  const [incomingCallPayload, setIncomingCallPayload] = useState(null);
  const callManagerRef = useRef(null);
  const messageChannelRef = useRef(null);
  const requestChannelRef = useRef(null);

  const [deliveryCode, setDeliveryCode] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);

  const [currentStage, setCurrentStage] = useState('accepted');
  const [photoProofRequired, setPhotoProofRequired] = useState(false);
  const [myBlocks, setMyBlocks] = useState(new Set());
  const [blockedByOthers, setBlockedByOthers] = useState(new Set());
  const myBlocksRef = useRef(new Set());
  const blockedByOthersRef = useRef(new Set());

  // Hydration kontrolü - butonlar SSR sonrası aktif olsun
  const [isHydrated] = useState(true);

  const mapRef = useRef(null);
  const sonKonumRef = useRef(null);
  const lastLocationUpsertAtRef = useRef(0);
  const seenPendingIdsRef = useRef(new Set());
  const seenCompletedIdsRef = useRef(new Set());
  const offerTimeoutRef = useRef(null);
  const aktifIsRef = useRef(null);
  const chatAcikRef = useRef(false);
  const konumRef = useRef(null);
  const userRef = useRef(null);

  const fetchPublicProfiles = useCallback(async (userIds) => {
    const ids = Array.from(new Set((userIds || []).filter(Boolean)));
    if (ids.length === 0) return new Map();
    try {
      const { data, error } = await supabase.rpc('get_public_profiles', { ids });
      if (error) return new Map();
      const rows = Array.isArray(data) ? data : [];
      const map = new Map();
      for (const r of rows) {
        if (!r?.user_id) continue;
        map.set(r.user_id, r);
      }
      return map;
    } catch (e) {
      return new Map();
    }
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mesajlar, chatAcik, karsiYaziyor]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }, []);

  const enqueueOffline = useCallback((item) => {
    try {
      const key = 'radar_offline_queue';
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(arr) ? arr : [];
      next.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ts: Date.now(),
        ...item,
      });
      localStorage.setItem(key, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }, []);

  const flushOfflineQueue = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) return;
    try {
      const key = 'radar_offline_queue';
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      const queue = Array.isArray(arr) ? arr : [];
      if (queue.length === 0) return;

      const remaining = [];
      for (const item of queue) {
        try {
          if (item.type === 'profilkisi_update') {
            const { error } = await supabase
              .from('profilkisi')
              .update(item.data)
              .eq('user_id', item.user_id);
            if (error) throw error;
          } else if (item.type === 'request_insert') {
            const { error } = await supabase.from('requests').insert([item.data]);
            if (error) throw error;
          }
        } catch {
          remaining.push(item);
        }
      }

      if (remaining.length === 0) {
        localStorage.removeItem(key);
        showToast('Veriler eşitlendi');
      } else {
        localStorage.setItem(key, JSON.stringify(remaining));
      }
    } catch {}
  }, [showToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => { flushOfflineQueue(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushOfflineQueue]);

  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
    } catch (e) {
      showToast(t.errorOccurred);
    } finally {
      setAuthLoading(false);
    }
  };

  const updateDebug = useCallback((patch) => {
    if (!isDev) return;
    setDebugInfo(prev => ({
      ...prev,
      ...patch,
      _ts: new Date().toISOString(),
    }));
  }, [isDev]);

  useEffect(() => {
    let cancelled = false;
    const syncAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id || null;
        if (cancelled) return;
        setAuthUid(uid);
        setAuthSessionOk(Boolean(uid));
      } catch (e) {
        if (cancelled) return;
        setAuthUid(null);
        setAuthSessionOk(false);
      }
    };

    syncAuth();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      syncAuth();
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const requestNotifications = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) {
        showToast('Bildirimler bu tarayıcıda desteklenmiyor');
        setShowNotifPrompt(false);
        return;
      }
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        showToast('Bildirimler açıldı');
        setShowNotifPrompt(false);
      } else if (res === 'denied') {
        showToast('Bildirim izni reddedildi');
        setShowNotifPrompt(false);
      }
    } catch (e) {
      console.warn('Notification permission error', e);
    }
  }, [showToast]);

  const mapResetRef = useRef(null);

  const konumaGit = () => {
    if (mapResetRef.current) mapResetRef.current();
  };

  // Kullanıcı işlem geçmişini çek
  const fetchUserHistory = useCallback(async (userId) => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const [transactionsRes, jobsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('requests').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false })
      ]);
      
      const transactions = transactionsRes.data || [];
      const jobs = jobsRes.data || [];
      
      setUserHistory({
        transactions,
        completedJobs: jobs.filter(j => j.status === 'completed')
      });
    } catch (err) {
      console.error('Error fetching user history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Adres bilgilerini Supabase'e kaydet (onBlur ile tetiklenir)
  const saveAddressToSupabase = useCallback(async () => {
    if (!user?.id) return;
    // Optimistic: UI zaten güncel, sessizce kaydet
    try {
      await supabase
        .from('profilkisi')
        .update({
          address_line1: addressLine1,
          address_line2: addressLine2,
          city: addressCity,
          district: addressDistrict,
          neighborhood: addressNeighborhood,
          postal_code: addressPostalCode,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error saving address:', err);
    }
  }, [user?.id, addressLine1, addressLine2, addressCity, addressDistrict, addressNeighborhood, addressPostalCode]);

  useEffect(() => { aktifIsRef.current = aktifIs; }, [aktifIs]);
  useEffect(() => { chatAcikRef.current = chatAcik; }, [chatAcik]);
  useEffect(() => { konumRef.current = konum; }, [konum]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { myBlocksRef.current = myBlocks; }, [myBlocks]);
  useEffect(() => { blockedByOthersRef.current = blockedByOthers; }, [blockedByOthers]);

  const activateJob = useCallback((req) => {
    setAktifIs(prev => {
      if (prev && prev.id === req.id && prev.status === req.status &&
          prev.delivery_code === req.delivery_code &&
          prev.sender_confirmed === req.sender_confirmed &&
          prev.receiver_confirmed === req.receiver_confirmed) {
        return prev;
      }
      return req;
    });
    setGelenTalep(prev => (prev?.id === req.id ? null : prev));
    setChatAcik(true);
    setCurrentStage(req.status || 'accepted');
    if (req.delivery_code) setDeliveryCode(req.delivery_code);
    if (offerTimeoutRef.current) clearTimeout(offerTimeoutRef.current);
  }, []);

  // ─── INITIALIZATION ────────────────────────────────────────────────────────
  useEffect(() => {
    // Mobil viewport height optimizasyonu
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH, { passive: true });
    window.addEventListener('orientationchange', setVH, { passive: true });
    
    // iOS klavye event'leri - delegation ile
    const handleFocus = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        document.body.classList.add('keyboard-visible');
        setTimeout(setVH, 300);
      }
    };
    const handleBlur = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        document.body.classList.remove('keyboard-visible');
        setTimeout(setVH, 300);
      }
    };
    
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    
    // recovery/reset modal initial state is derived in useState initializers
    
    const loadUserFromSession = async (session) => {
      if (!session?.user) { setUser(null); return; }
      const { data: profile } = await supabase
        .from('profilkisi')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (profile) {
        const normalizedRoles = normalizeRolesValue(profile.roles);
        const existingRoles = normalizeRolesValue(userRef.current?.roles) || userRef.current?.roles;
        const existingHasNonDefault = Array.isArray(existingRoles) && existingRoles.some(r => r && r !== 'musteri');

        // If DB has no roles array and role is empty/default, keep existing non-default roles
        // to avoid UI reverting to grey due to a temporary/stale profile read.
        const dbFallbackRoles = profile.role ? [profile.role] : ['musteri'];
        const rolesForUser = normalizedRoles || ((profile.role && profile.role !== 'musteri') ? [profile.role] : (existingHasNonDefault ? existingRoles : dbFallbackRoles));
        const userData = {
          id: session.user.id,
          ...profile,
          roles: rolesForUser,
          is_available: profile.is_available ?? true,
          service_radius: profile.service_radius ?? DEFAULT_SERVICE_RADIUS_M,
        };
        setUser(userData);
        
        // Email doğrulama durumunu set et
        // Supabase Auth email_confirmed_at Veya profil email_verified
        const isEmailVerified = !!(session.user.email_confirmed_at || profile.email_verified);
        setEmailVerified(isEmailVerified);
        
        // Adres bilgilerini set et
        setAddressLine1(profile.address_line1 || '');
        setAddressLine2(profile.address_line2 || '');
        setAddressCity(profile.city || '');
        setAddressDistrict(profile.district || '');
        setAddressNeighborhood(profile.neighborhood || '');
        setAddressPostalCode(profile.postal_code || '');
        
        // Rol bilgilerini set et
        const userRoles = rolesForUser;
        setSelectedRoles(userRoles);
        setTempSelectedRoles(userRoles);
        // Tüm profil verilerini localStorage'a kaydet
        try {
          localStorage.setItem('radar_user', JSON.stringify(userData));
        } catch (e) {
          console.error('Error saving user to localStorage:', e);
        }
      } else {
        setUser(null);
      }
    };

    // Auth hydration: session kontrol et, sonra authInitialized=true yap.
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session || null;
        const uid = session?.user?.id || null;
        setAuthUid(uid);
        setAuthSessionOk(Boolean(uid));
        if (session?.user) {
          await loadUserFromSession(session);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Auth getSession failed:', e);
        setAuthUid(null);
        setAuthSessionOk(false);
        setUser(null);
      } finally {
        setAuthInitialized(true);
        flushOfflineQueue();
      }
    })();
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const uid = session?.user?.id || null;
      setAuthUid(uid);
      setAuthSessionOk(Boolean(uid));

      // Sadece gerçek değişikliklerde profil yükle, TOKEN_REFRESHED gibi eventleri atla
      if (!['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(_e)) return;

      // Eğer kullanıcı giriş yaptıysa ve profil yoksa otomatik düzelt
      if ((_e === 'SIGNED_IN' || _e === 'USER_UPDATED') && session?.user?.id) {
        const { data: existingProfile } = await supabase
          .from('profilkisi')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // Profil yok ama email ile kayıt var → user_id'yi güncelle
        if (!existingProfile) {
          const email = session.user.email;
          if (email) {
            const { data: wrongProfile } = await supabase
              .from('profilkisi')
              .select('user_id')
              .eq('email', email)
              .maybeSingle();
            if (wrongProfile?.user_id && wrongProfile.user_id !== session.user.id) {
              await supabase
                .from('profilkisi')
                .update({ user_id: session.user.id })
                .eq('email', email);
            }
          }
        }
      }

      await loadUserFromSession(session);
      setAuthInitialized(true);
      flushOfflineQueue();
    });

    let watchId = null;
    let heartbeatTimer = null;
    let initialPosDone = false;

    const upsertLastSeen = async (coords) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id || !coords) return;
        const { error } = await supabase.from('locations').upsert(
          {
            user_id: session.user.id,
            lat: coords.lat,
            lng: coords.lng,
            status: 'online',
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (error) console.error('Location upsert error:', error);
        lastLocationUpsertAtRef.current = Date.now();
      } catch (e) {
        console.error('Location upsert exception:', e);
      }
    };

    const handleVisibility = () => {
      // Sekme gizlense bile son görülmeyi güncelle (arka planda tamamen GPS mümkün değil)
      if (document.visibilityState === 'hidden') {
        const coords = sonKonumRef.current;
        if (coords) upsertLastSeen(coords);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Gerçek zamanlı yön (compass) - iOS ve Android
    const handleOrientation = (e) => {
      let h = null;
      if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
        // iOS
        h = e.webkitCompassHeading;
      } else if (e.absolute && e.alpha !== null) {
        // Android absolute
        h = (360 - e.alpha) % 360;
      }
      if (h !== null) setHeading(Math.round(h));
    };
    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    // Use Capacitor Geolocation plugin for Android app compatibility
    // Fallback to browser geolocation API
    const getCurrentPositionWithFallback = async (options) => {
      if (Geolocation) {
        return await Geolocation.getCurrentPosition(options);
      }
      // Browser fallback
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ coords: pos.coords }),
          reject,
          options
        );
      });
    };

    const initGeolocation = async () => {
      // Wait for Geolocation to load if using Capacitor
      let retries = 0;
      while (!Geolocation && retries < 10) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
      }

      try {
        // İlk açılışta konumu al
        const position = await getCurrentPositionWithFallback({
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 12000
        });
        if (!initialPosDone) {
          initialPosDone = true;
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          sonKonumRef.current = coords;
          setKonum(coords);
          await upsertLastSeen(coords);
        }
      } catch (e) {
        console.log('Initial position error:', e);
        initialPosDone = true;
      }

      // Konum izleme - periodic updates instead of watchPosition
      const locationInterval = window.setInterval(async () => {
        try {
          const position = await getCurrentPositionWithFallback({
            enableHighAccuracy: true,
            timeout: 10000
          });
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          const now = Date.now();
          if (sonKonumRef.current) {
            const mesafe = getDistance(sonKonumRef.current.lat, sonKonumRef.current.lng, coords.lat, coords.lng);
            if (mesafe < 5 && now - lastLocationUpsertAtRef.current < 25_000) {
              sonKonumRef.current = coords;
              setKonum(coords);
              return;
            }
          }
          sonKonumRef.current = coords;
          setKonum(coords);
          await upsertLastSeen(coords);
        } catch (e) {
          // Silent fail for periodic updates
        }
      }, 5000);
      watchId = locationInterval;

      // Heartbeat: kullanıcı hareket etmese bile görünür kalması için
      heartbeatTimer = window.setInterval(() => {
        const coords = sonKonumRef.current;
        if (coords) upsertLastSeen(coords);
      }, 45_000);
    };
    initGeolocation();

    return () => {
      if (watchId !== null) window.clearInterval(watchId);
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      authSub.unsubscribe();
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // ─── REALTIME LOGIC ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;


    // 1. BLOCKS CHANNEL
    const loadBlocks = async () => {
      const [mineRes, othersRes] = await Promise.all([
        supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
        supabase.from('blocks').select('blocker_id').eq('blocked_id', user.id),
      ]);
      setMyBlocks(new Set((mineRes.data || []).map(r => r.blocked_id)));
      setBlockedByOthers(new Set((othersRes.data || []).map(r => r.blocker_id)));
    };
    loadBlocks();

    const blocksChannel = supabase.channel(`blocks-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, (payload) => {
        const rec = payload.new || payload.old;
        if (rec && (rec.blocker_id === user.id || rec.blocked_id === user.id)) loadBlocks();
      })
      .subscribe((status, error) => {
        if (error) console.error("Blocks channel error:", error);
      });

    // 2. LOCATIONS CHANNEL
    const loadLocations = async () => {
      const sinceIso = new Date(Date.now() - LOCATION_STALE_MS).toISOString();
      const { data, error } = await supabase
        .from('locations')
        .select('user_id, lat, lng, status, last_seen')
        .gte('last_seen', sinceIso);
      if (error) return;

      const base = (data || []).filter(d => d.user_id !== user.id).map(d => ({
        user_id: d.user_id,
        lat: d.lat,
        lng: d.lng,
        status: d.status,
        last_seen: d.last_seen,
      }));

      const profileMap = await fetchPublicProfiles(base.map(x => x.user_id));

      const processed = base.map(d => {
        const p = profileMap.get(d.user_id);
        return {
          ...d,
          name: p?.name || 'Gizli',
          user_role: p?.role || 'musteri',
          roles: normalizeRolesValue(p?.roles) || (p?.role ? [p.role] : ['musteri']),
          is_available: p?.is_available ?? true,
          service_radius: p?.service_radius ?? DEFAULT_SERVICE_RADIUS_M,
          avatar_url: p?.avatar_url || null,
        };
      });

      setDigerleri(processed);
    };
    loadLocations();

    // SIMPLE POLLING: Every 5 seconds refresh all locations (reliable method)
    const pollInterval = setInterval(() => {
      loadLocations();
    }, 5000);

    // Refresh when page becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadLocations();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const applyLocationRecord = async (rec) => {
      if (rec.user_id === user.id) return;
      if (!isLocationFresh(rec.last_seen)) {
        setDigerleri(prev => prev.filter(d => d.user_id !== rec.user_id));
        return;
      }
      const profileMap = await fetchPublicProfiles([rec.user_id]);
      const profile = profileMap.get(rec.user_id);
      const normalizedRoles = normalizeRolesValue(profile?.roles);
      setDigerleri(prev => {
        const newOthers = prev.filter(d => d.user_id !== rec.user_id);
        return [...newOthers, {
          user_id: rec.user_id, 
          lat: rec.lat, 
          lng: rec.lng, 
          status: rec.status, 
          last_seen: rec.last_seen,
          name: profile?.name || 'Gizli', 
          user_role: profile?.role || 'musteri', 
          roles: normalizedRoles || (profile?.role ? [profile.role] : ['musteri']), 
          is_available: profile?.is_available ?? true,
          service_radius: profile?.service_radius ?? DEFAULT_SERVICE_RADIUS_M,
          avatar_url: profile?.avatar_url || null,
        }];
      });
    };

    const locationChannel = supabase.channel('locations-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'locations' }, p => applyLocationRecord(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'locations' }, p => applyLocationRecord(p.new))
      .subscribe((status, error) => {
        if (error) console.error("Locations channel error:", error);
      });

    // NOTE: Removed 10s periodic timer - now relying 100% on Supabase Realtime for efficiency
    // Real-time profile changes are handled by the 'profilkisi-realtime' channel below

    // 3. REQUESTS CHANNEL
    const processRequestChange = async (req) => {
      if (!req || (req.sender_id !== user.id && req.receiver_id !== user.id)) return;
      const otherId = req.sender_id === user.id ? req.receiver_id : req.sender_id;
      if (myBlocksRef.current.has(otherId) || blockedByOthersRef.current.has(otherId)) return;
      
      if (req.status === 'accepted' && isActiveReq(req)) {
        activateJob(req);
        if (req.sender_id === user.id) { setSentRequestId(null); sentRequestIdRef.current = null; }
        return;
      }

      if (ACTIVE_STATUSES.includes(req.status) && req.status !== 'accepted') {
        setAktifIs(prev => (prev?.id === req.id ? req : prev));
        setCurrentStage(req.status);
        return;
      }

      if (req.receiver_id === user.id && req.status === 'pending') {
        if (!seenPendingIdsRef.current.has(req.id)) {
          seenPendingIdsRef.current.add(req.id);
          const { data: profile } = await supabase.from('profilkisi').select('name, role').eq('user_id', req.sender_id).single();
          setGelenTalep({ ...req, senderName: profile?.name || '?', senderRole: profile?.role });
        }
        return;
      }

      if (req.status === 'rejected') {
        console.log("Offer rejected for request:", req.id);
        if (req.sender_id === user.id || sentRequestIdRef.current === req.id) { 
          showToast(t.offerRejected); 
          setSentRequestId(null); 
          sentRequestIdRef.current = null; 
        }
        if (req.receiver_id === user.id) setGelenTalep(prev => (prev?.id === req.id ? null : prev));
        return;
      }

      if (req.status === 'expired') {
        if (req.sender_id === user.id || sentRequestIdRef.current === req.id) { showToast(t.offerExpired); setSentRequestId(null); sentRequestIdRef.current = null; }
        setGelenTalep(prev => (prev?.id === req.id ? null : prev));
        return;
      }

      if (req.status === 'cancelled') {
        if (req.receiver_id === user.id) { showToast(t.offerCancelled); setGelenTalep(prev => (prev?.id === req.id ? null : prev)); }
        if (req.sender_id === user.id) { setSentRequestId(null); sentRequestIdRef.current = null; }
        return;
      }

      if (req.status === 'completed') {
        setAktifIs(prev => {
          if (prev?.id === req.id && !seenCompletedIdsRef.current.has(req.id)) {
            seenCompletedIdsRef.current.add(req.id);
            setChatAcik(false); setCurrentStage('accepted'); setDeliveryCode(null); setCodeInput(''); setCodeVerified(false); setPhotoProofRequired(false); setMesajlar([]); setUnreadCount(0);
            setReviewHedef(req.sender_id === user.id ? req.receiver_id : req.sender_id); setReviewAcik(true);
            return null;
          }
          return prev;
        });
      }
    };

    const loadRequests = async () => {
      const { data, error } = await supabase.from('requests').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).in('status', ['pending', ...ACTIVE_STATUSES]).order('created_at', { ascending: false }).limit(20);
      if (error) { console.error('Requests load error:', error); return; }
      const active = (data || []).find(r => isActiveReq(r));
      if (active) {
        setAktifIs(active);
        setCurrentStage(active.status || 'accepted');
        if (active.delivery_code) setDeliveryCode(active.delivery_code);
        setChatAcik(true);
      }
      
      const pendingSent = (data || []).find(r => r.sender_id === user.id && r.status === 'pending');
      if (pendingSent) { setSentRequestId(pendingSent.id); sentRequestIdRef.current = pendingSent.id; }

      const pendingReceived = (data || []).find(r => r.receiver_id === user.id && r.status === 'pending');
      if (pendingReceived && !seenPendingIdsRef.current.has(pendingReceived.id)) {
        seenPendingIdsRef.current.add(pendingReceived.id);
        const { data: profile } = await supabase.from('profilkisi').select('name, role').eq('user_id', pendingReceived.sender_id).single();
        setGelenTalep({ ...pendingReceived, senderName: profile?.name || '?', senderRole: profile?.role });
      }
    };
    loadRequests();

    if (requestChannelRef.current) {
      try { requestChannelRef.current.unsubscribe(); } catch {}
      requestChannelRef.current = null;
    }

    const requestChannel = supabase.channel(`requests-all-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, p => processRequestChange(p.new || p.old))
      .on('broadcast', { event: 'rejection' }, ({ payload }) => {
        console.log("Broadcast rejection received:", payload);
        if (payload.sender_id === user.id) {
          showToast(t.offerRejected);
          setSentRequestId(null);
          sentRequestIdRef.current = null;
        }
      })
      .on('broadcast', { event: 'confirm_sync' }, ({ payload }) => {
        console.log("Broadcast confirm_sync received:", payload);
        if (aktifIsRef.current && payload.request_id === aktifIsRef.current.id) {
          setAktifIs(prev => ({ ...prev, ...payload.update }));
        }
      })
      .on('broadcast', { event: 'code_verified' }, ({ payload }) => {
        if (aktifIsRef.current && payload.request_id === aktifIsRef.current.id) {
          setCodeVerified(payload.verified);
          if (payload.verified) showToast(t.codeVerified);
        }
      })
      .subscribe((status, error) => {
        console.log(`Requests channel status: ${status}`);
        if (error) console.error("Requests channel error:", error);
      });
    requestChannelRef.current = requestChannel;

    // 4. PROFILE CHANGES - Realtime role/color updates
    const profileChannel = supabase.channel('profilkisi-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profilkisi' }, async (payload) => {
        const updated = payload.new;
        if (!updated?.user_id) return;
        // Only update if this user is currently visible on map
        const isVisible = digerleriRef.current.some(d => d.user_id === updated.user_id);
        if (!isVisible) return;
        console.log('Profile update received for:', updated.user_id, 'role:', updated.role);
        // Fetch fresh profile data via RPC
        const profileMap = await fetchPublicProfiles([updated.user_id]);
        const profile = profileMap.get(updated.user_id);
        if (!profile) return;
        const nr = normalizeRolesValue(profile.roles);
        setDigerleri(prev => prev.map(d => {
          if (d.user_id !== updated.user_id) return d;
          return {
            ...d,
            name: profile.name || d.name,
            user_role: profile.role || d.user_role,
            roles: nr || (profile.role ? [profile.role] : (Array.isArray(d.roles) ? d.roles : ['musteri'])),
            is_available: profile.is_available ?? d.is_available,
            service_radius: profile.service_radius ?? d.service_radius,
            avatar_url: profile.avatar_url || d.avatar_url || null,
          };
        }));
      })
      .subscribe((status, error) => {
        console.log(`Profile channel status: ${status}`);
        if (error) console.error("Profile channel error:", error);
      });

    return () => {
      console.log("Cleaning up main Realtime channels");
      try { blocksChannel.unsubscribe(); } catch {}
      try { locationChannel.unsubscribe(); } catch {}
      try { requestChannel.unsubscribe(); } catch {}
      try { profileChannel.unsubscribe(); } catch {}
      requestChannelRef.current = null;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.id]);

  // History sayfası açıldığında verileri çek
  useEffect(() => {
    if (aktifPage === 'history' && user?.id) {
      setTimeout(() => fetchUserHistory(user.id), 0);
    }
  }, [aktifPage, user?.id, fetchUserHistory]);

  // 4. MESSAGES CHANNEL
  useEffect(() => {
    if (!aktifIs?.id || !user) return;

    console.log("Setting up Messages channel for:", aktifIs.id);

    const loadMessages = async () => {
      const { data, error } = await supabase.from('messages').select('*').eq('request_id', aktifIs.id).order('created_at', { ascending: true });
      if (error) console.error('Messages load error:', error);
      if (data) setMesajlar(data);
    };
    loadMessages();

    const messageChannel = supabase.channel(`messages-room-${aktifIs.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        if (!msg || msg.request_id !== aktifIs.id) return;
        setMesajlar(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          const tempIdx = prev.findIndex(m => typeof m.id === 'string' && m.id.startsWith('temp-') && m.sender_id === msg.sender_id && m.content === msg.content);
          if (tempIdx !== -1) { const updated = [...prev]; updated[tempIdx] = msg; return updated; }
          return [...prev, msg];
        });
        if (msg.sender_id !== user.id && !chatAcikRef.current) setUnreadCount(c => c + 1);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        if (msg && msg.request_id === aktifIs.id) setMesajlar(prev => prev.map(m => (m.id === msg.id ? msg : m)));
      })
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (payload.sender_id === user.id) return; // Kendi gönderdiğimiz broadcasti yoksay
        setMesajlar(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
        if (!chatAcikRef.current) setUnreadCount(c => c + 1);
      })
      .subscribe((status, error) => {
        console.log(`Messages channel status: ${status}`);
        if (error) console.error("Messages channel error:", error);
      });
    messageChannelRef.current = messageChannel;

    const typingChannel = supabase.channel(`typing-${aktifIs.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setKarsiYaziyor(true);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setKarsiYaziyor(false), 3000);
        }
      })
      .subscribe();
    typingChannelRef.current = typingChannel;

    // CALL SIGNALING LISTENER (GLOBAL)
    const callSignalChannel = supabase.channel(`call-signal-${aktifIs.id}`)
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.to === user.id && payload.type === 'offer') {
          setIncomingCallPayload(payload);
          setCallState('incoming');
        }
      })
      .subscribe();

    return () => {
      console.log("Cleaning up Messages channels");
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(callSignalChannel);
      messageChannelRef.current = null;
      typingChannelRef.current = null;
    };
  }, [aktifIs?.id, user?.id]);

  // ─── ACTIONS ──────────────────────────────────────────────────────────────
  const normalizePhoneE164 = (dial, number) => {
    const d = (dial || '').trim().startsWith('+') ? (dial || '').trim() : `+${(dial || '').trim()}`;
    const n = (number || '').replace(/\D/g, '');
    if (!d || d === '+') return '';
    return `${d}${n}`;
  };

  // Phone verification deprecated - using email only

  const handleSendLoginCode = async () => {
    if (!tempEmail.trim()) return alert(t.noName);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: tempEmail.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setLoginOtpSent(true);
      showToast(t.codeSent);
    } catch (err) {
      console.error('OTP send error:', err);
      // Rate limit hatasi kontrolu
      if (err.message?.includes('For security purposes') || err.message?.includes('seconds')) {
        const match = err.message.match(/(\d+)\s*seconds?/);
        const waitSeconds = match ? match[1] : 'birkaç';
        showToast(`Lütfen ${waitSeconds} saniye sonra tekrar deneyin`);
      } else {
        showToast(t.errorOccurred);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendLoginSms = async () => {
    const phone = normalizePhoneE164(tempPhoneDial, tempPhone);
    if (!phone) return alert(t.noName);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setLoginSmsSent(true);
      showToast(t.codeSent);
    } catch (err) {
      console.error('SMS OTP send error:', err);
      showToast(t.errorOccurred);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyLoginSms = async () => {
    const phone = normalizePhoneE164(tempPhoneDial, tempPhone);
    if (!phone || !loginSmsCode.trim()) return alert(t.noName);
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: loginSmsCode.trim(),
        type: 'sms',
      });
      if (error) throw error;
      if (!data?.user?.id) throw new Error('No user');

      const { data: profile, error: profileError } = await supabase
        .from('profilkisi')
        .select('*')
        .eq('user_id', data.user.id)
        .single();
      if (profileError) throw profileError;

      const normalizedRoles = normalizeRolesValue(profile?.roles);
      const rolesForUser = normalizedRoles || (profile?.role ? [profile.role] : ['musteri']);
      const loggedUser = { id: data.user.id, ...profile, roles: rolesForUser };
      setUser(loggedUser);
      setSelectedRoles(rolesForUser);
      setTempSelectedRoles(rolesForUser);
      localStorage.setItem('radar_user', JSON.stringify(loggedUser));
    } catch (err) {
      console.error('SMS OTP verify error:', err);
      showToast(t.authError);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyLoginCode = async () => {
    if (!tempEmail.trim() || !loginOtpCode.trim()) return alert(t.noName);
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: tempEmail.trim(),
        token: loginOtpCode.trim(),
        type: 'email',
      });
      if (error) throw error;
      if (!data?.user?.id) throw new Error('No user');

      const { data: profile, error: profileError } = await supabase
        .from('profilkisi')
        .select('*')
        .eq('user_id', data.user.id)
        .single();
      if (profileError) throw profileError;

      const normalizedRoles = normalizeRolesValue(profile?.roles);
      const rolesForUser = normalizedRoles || (profile?.role ? [profile.role] : ['musteri']);
      const loggedUser = { id: data.user.id, ...profile, roles: rolesForUser };
      setUser(loggedUser);
      setSelectedRoles(rolesForUser);
      setTempSelectedRoles(rolesForUser);
      localStorage.setItem('radar_user', JSON.stringify(loggedUser));
    } catch (err) {
      console.error('OTP verify error:', err);
      showToast(t.authError);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = useCallback(async () => {
    if (!tempEmail.trim() || !tempPassword) return alert(t.noName);
    setAuthLoading(true);

    const attemptLogin = async () => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );
      const { data: authData, error: authError } = await Promise.race([
        supabase.auth.signInWithPassword({
          email: tempEmail.trim(),
          password: tempPassword,
        }),
        timeoutPromise
      ]);
      if (authError) throw authError;
      return authData;
    };

    try {
      let authData = null;
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          authData = await attemptLogin();
          break;
        } catch (err) {
          lastErr = err;
          if (err.message !== 'Timeout') throw err;
          if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
      if (!authData) throw lastErr;

      const { data: profiles } = await supabase
        .from('profilkisi')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      const profile = profiles?.[0] || null;
      if (!profile) throw new Error('Profil bulunamadı');

      const normalizedRoles = normalizeRolesValue(profile?.roles);
      const rolesForUser = normalizedRoles || (profile?.role ? [profile.role] : ['musteri']);
      const loggedUser = { id: authData.user.id, ...profile, roles: rolesForUser };
      setUser(loggedUser);
      setSelectedRoles(rolesForUser);
      setTempSelectedRoles(rolesForUser);
      localStorage.setItem('radar_user', JSON.stringify(loggedUser));
    } catch (err) {
      console.error('Login error:', err);
      alert(t.authError + " (" + (err.message || "Bilinmeyen hata") + ")");
    } finally {
      setAuthLoading(false);
    }
  }, [tempEmail, tempPassword, t]);

  const handleRegister = async () => {
    if (!tempName.trim() || !tempEmail.trim() || !tempPassword || !tempBirthDate || !tempCountry) {
      return alert(t.noName);
    }
    if (tempPasswordConfirm !== tempPassword) return alert(t.passwordsNoMatch);
    
    setAuthLoading(true);
    const phoneE164 = normalizePhoneE164(tempPhoneDial, tempPhone);
    
    try {
      // Önce email ve telefon kontrolü
      const { data: existingEmail } = await supabase
        .from('profilkisi')
        .select('email')
        .eq('email', tempEmail.trim())
        .maybeSingle();
      
      if (existingEmail) {
        setAuthLoading(false);
        return alert('Bu e-posta adresi zaten kullanılıyor!');
      }
      
      if (phoneE164) {
        const { data: existingPhone } = await supabase
          .from('profilkisi')
          .select('phone')
          .eq('phone', phoneE164)
          .maybeSingle();
        
        if (existingPhone) {
          setAuthLoading(false);
          return alert('Bu telefon numarası zaten kullanılıyor!');
        }
      }
      
      // Email + şifre ile kayıt (doğrulama yok)
      const signUpTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 30000)
      );
      const { data: signUpData, error: signUpError } = await Promise.race([
        supabase.auth.signUp({
          email: tempEmail.trim(),
          password: tempPassword,
          options: {
            data: { name: tempName.trim(), phone: phoneE164 }
          }
        }),
        signUpTimeout
      ]);
      
      if (signUpError) throw signUpError;
      if (!signUpData?.user?.id) throw new Error('Kullanıcı oluşturulamadı');
      
      // Profil oluştur
      const profileData = {
        user_id: signUpData.user.id,
        name: tempName.trim(),
        email: tempEmail.trim(),
        birth_date: tempBirthDate,
        country: tempCountry,
        phone: phoneE164,
        role: tempRole,
        roles: [tempRole],
        is_available: true,
        service_radius: DEFAULT_SERVICE_RADIUS_M
      };
      
      const { error: profileError } = await supabase.from('profilkisi').upsert(profileData, { onConflict: 'user_id' });
      
      if (profileError) {
        alert('Profil hatası: ' + profileError.message);
        throw profileError;
      }
      
      // Kullanıcıyı ayarla ve giriş yap
      const newUser = { id: signUpData.user.id, ...profileData };
      setUser(newUser);
      localStorage.setItem('radar_user', JSON.stringify(newUser));
      setIsLoginView(false);
      
      // Form temizle
      setTempName('');
      setTempEmail('');
      setTempPassword('');
      setTempPasswordConfirm('');
      setTempBirthDate('');
      setTempPhone('');
      
      showToast('Kayıt başarılı!');
      
    } catch (err) {
      console.error('Registration error:', err);
      alert(t.regError + " (" + (err.message || "Bilinmeyen hata") + ")");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendEmailVerification = async () => {
    if (!user?.email) return;
    setProfileEditLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: { shouldCreateUser: false }
      });
      if (error) throw error;
      setShowEmailVerifyModal(true);
      setEmailVerifyCode('');
      showToast(t.codeSent);
    } catch (err) {
      alert(t.errorOccurred + ': ' + err.message);
    } finally {
      setProfileEditLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!emailVerifyCode.trim() || !user?.email) return;
    setProfileEditLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: user.email,
        token: emailVerifyCode.trim(),
        type: 'email'
      });
      if (error) throw error;
      
      // Veritabanında doğrulandı olarak kaydet
      await supabase.from('profilkisi').update({ email_verified: true }).eq('user_id', user.id);
      
      setEmailVerified(true);
      const updatedUser = { ...user, email_verified: true };
      setUser(updatedUser);
      localStorage.setItem('radar_user', JSON.stringify(updatedUser));
      setShowEmailVerifyModal(false);
      showToast(t.emailVerified);
    } catch (err) {
      alert(t.invalidCode);
    } finally {
      setProfileEditLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!user?.id) return;
    setProfileEditLoading(true);
    try {
      const addressData = {
        address_line1: addressLine1,
        address_line2: addressLine2,
        city: addressCity,
        district: addressDistrict,
        neighborhood: addressNeighborhood,
        postal_code: addressPostalCode
      };

      if (typeof window !== 'undefined' && !navigator.onLine) {
        enqueueOffline({ type: 'profilkisi_update', user_id: user.id, data: addressData });
        const updatedUser = { ...user, ...addressData };
        setUser(updatedUser);
        localStorage.setItem('radar_user', JSON.stringify(updatedUser));
        showToast('Çevrimdışı: kaydedildi, bağlantı gelince eşitlenecek');
        return;
      }
      
      const { error } = await supabase
        .from('profilkisi')
        .update(addressData)
        .eq('user_id', user.id);
      if (error) throw error;
      
      // LocalStorage'a da kaydet
      const updatedUser = { ...user, ...addressData };
      setUser(updatedUser);
      localStorage.setItem('radar_user', JSON.stringify(updatedUser));
      
      showToast(t.addressSaved);
    } catch (err) {
      console.error('Save address error:', err);
      alert(t.errorOccurred + ': ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setProfileEditLoading(false);
    }
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) {
      alert('Dosya veya kullanıcı bulunamadı');
      return;
    }
    
    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }
    
    setProfileEditLoading(true);
    try {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      if (!allowedExts.includes(fileExt)) {
        throw new Error('Sadece JPG, PNG, GIF veya WebP dosyaları yüklenebilir');
      }
      
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      console.log('Uploading file:', filePath, 'Size:', file.size, 'Type:', file.type);
      
      // Önce bucket'ın var olduğunu kontrol et
      const { data: buckets } = await supabase.storage.listBuckets();
      console.log('Available buckets:', buckets);
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });
      
      if (uploadError) {
        console.error('Upload error details:', uploadError);
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('Storage bucket bulunamadı. Lütfen Supabase\'de "profile-photos" bucket\'ını oluşturun.');
        }
        if (uploadError.message?.includes('row-level security')) {
          throw new Error('Storage izin hatası. Lütfen RLS politikalarını kontrol edin.');
        }
        throw new Error(uploadError.message || 'Yükleme başarısız');
      }
      
      console.log('Upload success:', uploadData);
      
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);
      
      console.log('Public URL:', publicUrl);
      
      const { error: updateError } = await supabase.from('profilkisi').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error('Profil fotoğrafı kaydedilemedi: ' + updateError.message);
      }
      
      setUser({ ...user, avatar_url: publicUrl });
      localStorage.setItem('radar_user', JSON.stringify({ ...user, avatar_url: publicUrl }));
      showToast(t.photoUploaded);
    } catch (err) {
      console.error('Photo upload error:', err);
      alert('Fotoğraf yüklenemedi: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setProfileEditLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || newEmail === user.email) return;
    setProfileEditLoading(true);
    try {
      // Eski email'e kod gönder
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: { shouldCreateUser: false }
      });
      if (otpError) throw otpError;
      
      setEmailChangeStep('verify-old-code');
      setOldEmailCode('');
      setNewEmailCode('');
      showToast(t.codeSentToOld);
    } catch (err) {
      alert(t.errorOccurred);
    } finally {
      setProfileEditLoading(false);
    }
  };

  const verifyOldEmailCode = async () => {
    if (!oldEmailCode.trim()) return;
    setProfileEditLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: user.email,
        token: oldEmailCode.trim(),
        type: 'email'
      });
      if (error) throw error;
      
      // Eski email doğrulandı, yeni email'e kod gönder
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: newEmail.trim(),
        options: { shouldCreateUser: false }
      });
      if (otpError) throw otpError;
      
      setEmailChangeStep('verify-new');
      showToast(t.codeSentToNew);
    } catch (err) {
      alert(t.invalidCode);
    } finally {
      setProfileEditLoading(false);
    }
  };

  const verifyNewEmailAndUpdate = async () => {
    if (!newEmailCode.trim()) return;
    setProfileEditLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: newEmail.trim(),
        token: newEmailCode.trim(),
        type: 'email'
      });
      if (error) throw error;
      
      // Email'i güncelle
      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (updateError) throw updateError;
      
      await supabase.from('profilkisi').update({ email: newEmail.trim() }).eq('user_id', user.id);
      
      setUser({ ...user, email: newEmail.trim() });
      setShowChangeEmailModal(false);
      setNewEmail('');
      setEmailChangeStep('verify-old');
      showToast(t.emailChanged);
    } catch (err) {
      alert(t.errorOccurred);
    } finally {
      setProfileEditLoading(false);
    }
  };

  const handleVerifyEmailAndCompleteRegister = async () => {
    if (!emailVerifyCode.trim() || !tempEmail.trim()) return;
    setEmailVerifyLoading(true);
    try {
      // 6 haneli signup kodunu doğrula
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: tempEmail.trim(),
        token: emailVerifyCode.trim(),
        type: 'signup'
      });
      if (verifyError) throw verifyError;
      if (!verifyData?.user?.id) throw new Error('Kullanıcı doğrulanamadı');

      // Profil oluştur
      const phoneE164 = pendingPhoneE164 || normalizePhoneE164(tempPhoneDial, tempPhone);
      const profileData = {
        user_id: verifyData.user.id,
        name: tempName.trim(),
        email: tempEmail.trim(),
        birth_date: tempBirthDate,
        country: tempCountry,
        phone: phoneE164,
        role: tempRole,
        roles: [tempRole],
        is_available: true,
        service_radius: DEFAULT_SERVICE_RADIUS_M
      };

      const { error: profileError } = await supabase.from('profilkisi').upsert(profileData, { onConflict: 'user_id' });
      if (profileError) throw profileError;

      // Kullanıcıyı ayarla
      const newUser = { id: verifyData.user.id, ...profileData };
      setUser(newUser);
      localStorage.setItem('radar_user', JSON.stringify(newUser));
      setEmailVerifyOpen(false);
      setIsLoginView(false);
      showToast(t.reviewSent);
      
      // Form temizle
      setTempName('');
      setTempEmail('');
      setTempPassword('');
      setTempPasswordConfirm('');
      setTempBirthDate('');
      setTempCountry('Türkiye');
      setTempPhone('');
      setPendingAuthUser(null);
    } catch (err) {
      console.error('Email verification error:', err);
      alert(t.authError + " (" + (err.message || "Bilinmeyen hata") + ")");
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleTalepGonder = async () => {
    if (!seciliKisi || !user) return;
    if (myBlocksRef.current.has(seciliKisi.user_id) || blockedByOthersRef.current.has(seciliKisi.user_id)) return showToast(t.userBlocked);
    // Optimistic: UI'ı hemen kapat
    const savedKisi = seciliKisi;
    const savedDetay = isDetayi;
    const savedFiyat = teklifFiyat;
    setSeciliKisi(null); setIsDetayi(''); setTeklifFiyat('');
    setTalepGonderiliyor(true);
    try {
      const sessionUid = authSessionOk ? authUid : null;
      updateDebug({ auth: { uid: sessionUid, ok: Boolean(sessionUid) } });
      if (!sessionUid) {
        updateDebug({
          lastRequest: {
            ok: false,
            sender_id: user?.id,
            receiver_id: seciliKisi?.user_id,
            error: 'No Supabase session (auth.uid() is null). Please login again.',
          },
        });
        showToast('Oturum bulunamadı. Lütfen tekrar giriş yap.');
        return;
      }
      if (user?.id && sessionUid !== user.id) {
        updateDebug({
          lastRequest: {
            ok: false,
            sender_id: user?.id,
            receiver_id: seciliKisi?.user_id,
            error: `Session user mismatch. sessionUid=${sessionUid} localUserId=${user.id}`,
          },
        });
        showToast('Oturum uyuşmazlığı. Lütfen çıkış yapıp tekrar giriş yap.');
        return;
      }

      const payload = {
        sender_id: user.id,
        receiver_id: seciliKisi.user_id,
        title: isDetayi || `${t.jobRequestFrom}${user.name}`,
        price: teklifFiyat ? parseFloat(teklifFiyat) : null,
        status: 'pending',
        active_job: false,
      };

      if (typeof window !== 'undefined' && !navigator.onLine) {
        enqueueOffline({ type: 'request_insert', data: payload, user_id: user.id });
        showToast('Çevrimdışı: teklif kuyruğa alındı');
        setSeciliKisi(null); setIsDetayi(''); setTeklifFiyat('');
        return;
      }

      const { data, error } = await supabase.from('requests').insert([payload]).select().single();
      if (error) throw error;

      updateDebug({
        lastRequest: {
          ok: true,
          id: data?.id,
          sender_id: user.id,
          receiver_id: savedKisi.user_id,
        },
      });
      setSentRequestId(data.id); sentRequestIdRef.current = data.id;
    } catch (err) {
      // Hata olursa geri al
      setSeciliKisi(savedKisi); setIsDetayi(savedDetay); setTeklifFiyat(savedFiyat);
      console.error('handleTalepGonder error:', err);
      const msg = err?.message || err?.details || err?.hint || String(err);
      updateDebug({
        lastRequest: {
          ok: false,
          sender_id: user?.id,
          receiver_id: savedKisi?.user_id,
          error: msg,
        },
      });
      showToast(`Hata: ${msg}`);
    } finally {
      setTalepGonderiliyor(false);
    }
  };

  const handleOfferCancel = async () => {
    if (!sentRequestId) return;
    const savedId = sentRequestId;
    // Optimistic
    setSentRequestId(null); sentRequestIdRef.current = null; showToast(t.offerCancelled);
    const { error } = await supabase.from('requests').update({ status: 'cancelled' }).eq('id', savedId);
    if (error) console.error('Cancel offer error:', error);
  };

  const handleTalepKabul = async () => {
    if (!gelenTalep) return;
    const code = generateDeliveryCode();
    // Optimistic: hemen kabul et
    const optimisticJob = { ...gelenTalep, status: 'accepted', active_job: true, delivery_code: code };
    activateJob(optimisticJob);
    setGelenTalep(null);
    const { data, error } = await supabase.from('requests').update({ status: 'accepted', active_job: true, delivery_code: code }).eq('id', gelenTalep.id).select().single();
    if (error) console.error('Accept request error:', error);
    if (data) activateJob(data);
  };

  const handleTalepRed = async () => {
    if (!gelenTalep) return;
    const savedTalep = gelenTalep;
    // Optimistic: hemen kapat
    setGelenTalep(null);
    // Instant broadcast rejection
    if (requestChannelRef.current) {
      requestChannelRef.current.send({
        type: 'broadcast',
        event: 'rejection',
        payload: { sender_id: savedTalep.sender_id, request_id: savedTalep.id }
      });
    }
    const { error } = await supabase.from('requests').update({ status: 'rejected' }).eq('id', savedTalep.id);
    if (error) console.error('Reject request error:', error);
  };

  const handleOnayla = async () => {
    if (!aktifIs || !user) return;
    const isSender = aktifIs.sender_id === user.id;
    const updateData = isSender ? { sender_confirmed: true } : { receiver_confirmed: true };
    
    // UI Update (Optimistic)
    setAktifIs(prev => ({ ...prev, ...updateData }));

    // Instant broadcast for sync
    if (requestChannelRef.current) {
      requestChannelRef.current.send({
        type: 'broadcast',
        event: 'confirm_sync',
        payload: { request_id: aktifIs.id, update: updateData }
      });
    }

    const { data, error } = await supabase.from('requests').update(updateData).eq('id', aktifIs.id).select().single();
    if (error) console.error('Confirm error:', error);
    if (data) setAktifIs(data);
  };

  const handleAdvanceStage = async (nextStage) => {
    if (!aktifIs) return;
    if (['picked_up', 'delivered'].includes(nextStage) && ['kurye', 'emanetci'].includes(user?.role || '')) { setPhotoProofRequired(true); return; }
    // Optimistic
    setAktifIs(prev => ({ ...prev, status: nextStage }));
    setCurrentStage(nextStage);
    const { data, error } = await supabase.from('requests').update({ status: nextStage }).eq('id', aktifIs.id).select().single();
    if (error) console.error('Advance stage error:', error);
    if (data) { setAktifIs(data); setCurrentStage(data.status); }
  };

  const handleTamamla = async () => {
    if (!aktifIs || !user) return;
    const isSender = aktifIs.sender_id === user.id;
    const updateData = isSender ? { sender_completed: true } : { receiver_completed: true };
    const merged = { ...aktifIs, ...updateData };
    const willComplete = merged.sender_completed && merged.receiver_completed;
    if (willComplete) { updateData.status = 'completed'; updateData.active_job = false; }
    // Optimistic
    setAktifIs(prev => ({ ...prev, ...updateData }));
    if (willComplete) {
      setAktifIs(null); setChatAcik(false); setCurrentStage('accepted'); setDeliveryCode(null); setCodeInput(''); setCodeVerified(false); setPhotoProofRequired(false); setMesajlar([]); setUnreadCount(0);
      setReviewHedef(isSender ? aktifIs.receiver_id : aktifIs.sender_id); setReviewAcik(true);
    }
    const { data, error } = await supabase.from('requests').update(updateData).eq('id', aktifIs.id).select().single();
    if (error) console.error('Complete job error:', error);
  };

  const handleVerifyCode = () => {
    if (codeInput === deliveryCode) { 
      setCodeVerified(true); 
      showToast(t.codeVerified);
      if (requestChannelRef.current) {
        requestChannelRef.current.send({
          type: 'broadcast',
          event: 'code_verified',
          payload: { request_id: aktifIs.id, verified: true }
        });
      }
    }
    else showToast(t.codeWrong);
  };

  const handleMesajGonder = async () => {
    if (!yeniMesaj.trim() || !aktifIs || !user) return;
    setMesajGonderiliyor(true);
    const content = yeniMesaj.trim();
    const tempId = `temp-${Date.now()}`;
    const msgData = { id: tempId, request_id: aktifIs.id, sender_id: user.id, content, type: 'text', created_at: new Date().toISOString() };
    
    // UI Update (Optimistic)
    setMesajlar(prev => [...prev, msgData]);
    setYeniMesaj('');

    // Instant broadcast - EN HIZLI GÖNDERİM
    if (messageChannelRef.current) {
      messageChannelRef.current.send({ 
        type: 'broadcast', 
        event: 'new_message', 
        payload: msgData 
      });
    }

    // DB Insert (Background)
    const { error } = await supabase.from('messages').insert([{ request_id: aktifIs.id, sender_id: user.id, content, type: 'text' }]);
    if (error) { 
      setMesajlar(prev => prev.filter(m => m.id !== tempId)); 
      setYeniMesaj(content); 
      showToast(t.msgNotSent); 
    }
    setMesajGonderiliyor(false);
  };

  const handleTypingInput = (val) => {
    setYeniMesaj(val);
    if (!typingChannelRef.current || !user?.id) return;
    if (typingBroadcastTimerRef.current) clearTimeout(typingBroadcastTimerRef.current);
    typingBroadcastTimerRef.current = setTimeout(() => {
      typingChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id } });
    }, 300);
  };

  const handleFotoGonder = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !aktifIs || !user) return;
    const fileName = `${aktifIs.id}/${Date.now()}_${file.name}`;
    const bucket = photoProofRequired ? PROOF_BUCKET : CHAT_BUCKET;
    const tempId = `temp-photo-${Date.now()}`;
    setMesajlar(prev => [...prev, { id: tempId, content: t.photoUploading, type: 'text', sender_id: user.id }]);
    const { error: upErr } = await supabase.storage.from(bucket).upload(fileName, file);
    if (upErr) { 
      setMesajlar(prev => prev.filter(m => m.id !== tempId)); 
      showToast(t.photoUploadError);
      return; 
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    setMesajlar(prev => prev.filter(m => m.id !== tempId));
    await supabase.from('messages').insert([{ request_id: aktifIs.id, sender_id: user.id, content: urlData.publicUrl, type: 'image' }]);
    if (photoProofRequired) handleAdvanceStage(currentStage === 'arrived' ? 'picked_up' : 'delivered');
    setPhotoProofRequired(false);
  };

  const handleVoiceMsgSend = async (blob) => {
    if (!aktifIs || !user) return;
    const fileName = `${aktifIs.id}/voice_${Date.now()}.webm`;
    const { error: upErr } = await supabase.storage.from(CHAT_BUCKET).upload(fileName, blob, { contentType: 'audio/webm' });
    if (upErr) {
      showToast(t.voiceUploadError);
      return;
    }
    const { data: urlData } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(fileName);
    await supabase.from('messages').insert([{ request_id: aktifIs.id, sender_id: user.id, content: urlData.publicUrl, type: 'audio' }]);
  };

  const handleReviewGonder = async () => {
    if (!reviewHedef || !user) return;
    await supabase.from('profilreviews').insert([{ target_id: reviewHedef, reviewer_id: user.id, rating: reviewPuan, comment: reviewYorum }]);
    setReviewAcik(false); setReviewPuan(5); setReviewYorum(''); showToast(t.reviewSent);
  };

  const handleProfilAc = async (kisi) => {
    setProfilKisi(kisi);
    const { data: reviews } = await supabase.from('profilreviews').select('*').eq('target_id', kisi.user_id).order('created_at', { ascending: false });
    setProfilReviews(reviews || []);
    const avg = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const { count } = await supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'completed').or(`sender_id.eq.${kisi.user_id},receiver_id.eq.${kisi.user_id}`);
    setProfilStats({ avg: avg.toFixed(1), count: reviews?.length || 0, jobCount: count || 0 });
  };

  const handleBlock = async (targetId) => {
    if (!user) return;
    await supabase.from('blocks').upsert({ blocker_id: user.id, blocked_id: targetId });
    setDigerleri(prev => prev.filter(d => d.user_id !== targetId)); setProfilKisi(null); showToast(t.blocked);
  };

  const handleReport = async (targetId) => {
    if (!user) return;
    await supabase.from('reports').insert({ reporter_id: user.id, reported_id: targetId, reason: 'report' });
    showToast(t.reported);
  };

  const handleStartCall = async () => {
    if (!aktifIs || !user) return;
    const remoteId = aktifIs.sender_id === user.id ? aktifIs.receiver_id : aktifIs.sender_id;
    if (myBlocksRef.current.has(remoteId)) return showToast(t.userBlocked);
    const mgr = new VoiceCallManager(supabase, user.id, aktifIs.id, (state, payload) => {
      setCallState(state); if (state === 'incoming') setIncomingCallPayload(payload);
    });
    callManagerRef.current = mgr; await mgr.startCall(remoteId);
  };

  const handleAcceptCall = async () => {
    if (!incomingCallPayload || !aktifIs || !user) return;
    const mgr = new VoiceCallManager(supabase, user.id, aktifIs.id, (state) => setCallState(state));
    callManagerRef.current = mgr; await mgr.acceptCall(incomingCallPayload.sdp, incomingCallPayload.from); setIncomingCallPayload(null);
  };

  const handleDeclineCall = async () => {
    if (!incomingCallPayload || !aktifIs?.id || !user) return;
    const ch = supabase.channel(`call-signal-${aktifIs.id}`);
    await ch.send({ type: 'broadcast', event: 'signal', payload: { type: 'decline', from: user.id, to: incomingCallPayload.from } });
    supabase.removeChannel(ch); setIncomingCallPayload(null); setCallState('idle');
  };

  const handleEndCall = async () => {
    if (!aktifIs?.id || !user) return;
    const ch = supabase.channel(`call-signal-${aktifIs.id}`);
    await ch.send({ type: 'broadcast', event: 'signal', payload: { type: 'hangup', from: user.id, to: (aktifIs.sender_id === user.id ? aktifIs.receiver_id : aktifIs.sender_id) } });
    supabase.removeChannel(ch); callManagerRef.current?.endCall(); setCallState('idle');
  };

  const handleLangChange = (l) => { 
    const next = TRANSLATIONS[l] ? l : 'en';
    setLang(next); 
    localStorage.setItem('radar_lang', next); 
    setLangMenuAcik(false); 
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setAktifIs(null); setGelenTalep(null); setMesajlar([]); setChatAcik(false); setUnreadCount(0); setCallState('idle'); };

  const filteredDigerleri = (() => {
    const result = digerleri.filter(u => {
      // Engelleme kontrolü
      if (myBlocks.has(u.user_id) || blockedByOthers.has(u.user_id)) return false;
      
      // Konum tazlığı kontrolü (stale konumları filtrele)
      if (!isLocationFresh(u.last_seen)) return false;
      
      // Rol filtresi
      if (aktifFiltre !== 'hepsi') {
        const userRoles = u.roles || [u.user_role];
        if (!userRoles.includes(aktifFiltre)) return false;
      }
      return true;
    });

    // 8 kullanıcı max göster, rol bazlı ve mesafe bazlı optimize
    if (result.length <= 8) return result;
    if (!konum?.lat || !konum?.lng) return result.slice(0, 8);

    const roleOrder = ['kurye', 'emanetci', 'siraci', 'hepsi'];
    const roleQuota = { kurye: 3, emanetci: 2, siraci: 2, hepsi: 1 };

    const getPrimaryRole = (u) => {
      const roles = u.roles || [u.user_role];
      for (const r of roleOrder) if (roles?.includes(r)) return r;
      return 'other';
    };

    const enriched = result
      .map(u => ({
        ...u,
        _primaryRole: getPrimaryRole(u),
        _distance: getDistance(konum.lat, konum.lng, u.lat, u.lng)
      }))
      .sort((a, b) => a._distance - b._distance);

    const selected = [];
    const used = new Set();

    // Quota bazlı seçim
    for (const r of roleOrder) {
      const quota = roleQuota[r] || 0;
      if (quota <= 0) continue;
      for (const u of enriched) {
        if (selected.length >= 8) break;
        if (used.has(u.user_id)) continue;
        if (u._primaryRole !== r) continue;
        selected.push(u);
        used.add(u.user_id);
        if (selected.filter(x => x._primaryRole === r).length >= quota) break;
      }
    }

    // Kalan 8'e kadar uzak olanları ekle
    for (const u of enriched) {
      if (selected.length >= 8) break;
      if (used.has(u.user_id)) continue;
      selected.push(u);
      used.add(u.user_id);
    }

    return selected.map(({ _primaryRole, _distance, ...rest }) => rest);
  })();

  // Map logic extracted to src/components/MapView

  const activeJobUserIds = aktifIs ? [aktifIs.sender_id, aktifIs.receiver_id] : [];
  const isSender = aktifIs?.sender_id === user?.id;
  const bothConfirmedFlag = aktifIs?.sender_confirmed && aktifIs?.receiver_confirmed;

  // Auth hydration bitmeden login/register ekranina dusup tekrar geri gelmesin
  if (!authInitialized) return <LoadingScreen />;

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0F0F0F] text-white">
      <div className="w-full max-w-md p-6 rounded-[32px] bg-[#121212] border border-white/5 shadow-2xl relative">
        {/* Modern TICK Logo Background Decoration */}
        <div className="absolute -top-10 -right-10 text-9xl font-black text-white/5 italic select-none pointer-events-none transform rotate-12">
          TICK
        </div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-6xl font-black italic tracking-tighter text-[#2ECC71] transform -skew-x-12 inline-block mb-2">
              TICK
            </h2>
            <div className="flex justify-center gap-6 mt-4">
              <button
                type="button"
                onPointerDown={() => setIsLoginView(true)}
                onClick={() => setIsLoginView(true)}
                className={`text-sm font-black uppercase tracking-widest italic transition-all ${isLoginView ? 'text-[#2ECC71] border-b-2 border-[#2ECC71] pb-1' : 'text-white/20 hover:text-white/40'}`}
              >
                {t.login}
              </button>
              <button
                type="button"
                onPointerDown={() => setIsLoginView(false)}
                onClick={() => setIsLoginView(false)}
                className={`text-sm font-black uppercase tracking-widest italic transition-all ${!isLoginView ? 'text-[#2ECC71] border-b-2 border-[#2ECC71] pb-1' : 'text-white/20 hover:text-white/40'}`}
              >
                {t.register}
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
            {isLoginView ? (
              // LOGIN VIEW
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setLoginOtpMode(false); setLoginPhoneMode(false); setLoginOtpSent(false); setLoginOtpCode(''); setLoginSmsSent(false); setLoginSmsCode(''); }}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${!loginOtpMode && !loginPhoneMode ? 'bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/30' : 'bg-white/5 text-white/30 border-transparent'}`}
                  >
                    {t.loginWithPassword}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginOtpMode(true); setLoginPhoneMode(false); setLoginOtpSent(false); setLoginOtpCode(''); setLoginSmsSent(false); setLoginSmsCode(''); }}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${loginOtpMode && !loginPhoneMode ? 'bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/30' : 'bg-white/5 text-white/30 border-transparent'}`}
                  >
                    {t.loginWithCode}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginPhoneMode(true); setLoginOtpMode(false); setLoginOtpSent(false); setLoginOtpCode(''); setLoginSmsSent(false); setLoginSmsCode(''); }}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${loginPhoneMode ? 'bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/30' : 'bg-white/5 text-white/30 border-transparent'}`}
                  >
                    {t.loginWithPhone}
                  </button>
                </div>
                {!loginPhoneMode && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.email}</p>
                    <input 
                      type="email"
                      value={tempEmail} 
                      onChange={(e) => setTempEmail(e.target.value)} 
                      className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all" 
                      placeholder={t.emailPlaceholder} 
                    />
                  </div>
                )}

                {loginPhoneMode ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.phone}</p>
                      <div className="flex">
                        <PhoneSelector value={tempPhoneDial} onChange={setTempPhoneDial} dark={true} t={t} />
                        <input 
                          value={tempPhone} 
                          onChange={(e) => setTempPhone(e.target.value)} 
                          className="w-full bg-white/5 p-4 rounded-r-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all" 
                          placeholder={PHONE_COUNTRIES.find(c => c.dial === tempPhoneDial)?.example || t.phonePlaceholder} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.code}</p>
                      <input
                        value={loginSmsCode}
                        onChange={(e) => setLoginSmsCode(e.target.value)}
                        className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all"
                        placeholder={t.codePlaceholder}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleSendLoginSms}
                        disabled={authLoading}
                        className={`py-4 rounded-2xl bg-white/5 text-white/70 font-black uppercase tracking-widest text-[10px] border border-white/10 ${authLoading ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {authLoading ? '...' : t.sendCode}
                      </button>
                      <button
                        onClick={handleVerifyLoginSms}
                        disabled={authLoading || !loginSmsCode.trim()}
                        className={`py-4 rounded-2xl bg-[#2ECC71] text-black font-black uppercase tracking-widest text-[10px] ${authLoading || !loginSmsCode.trim() ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {authLoading ? '...' : t.verify}
                      </button>
                    </div>
                    {loginSmsSent && (
                      <div className="p-3 rounded-2xl bg-white/5 text-white/50 text-xs">
                        {t.codeSent}
                      </div>
                    )}
                  </>
                ) : !loginOtpMode ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.password}</p>
                      <input 
                        type="password"
                        value={tempPassword} 
                        onChange={(e) => setTempPassword(e.target.value)} 
                        className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all" 
                        placeholder={t.passwordPlaceholder} 
                      />
                      <button
                        type="button"
                        onClick={() => { setResetUsePhone(false); setResetOpen(true); setResetTarget(tempEmail.trim()); setResetSent(false); setResetPhoneSent(false); }}
                        className="mt-2 text-[11px] font-black uppercase tracking-wider text-white/30 hover:text-white/50 transition-colors"
                      >
                        {t.forgotPassword}
                      </button>
                    </div>
                    <button 
                      onClick={handleLogin} 
                      disabled={authLoading}
                      className={`w-full py-5 bg-[#2ECC71] text-black font-black rounded-[24px] uppercase italic tracking-widest mt-6 transition-all active:scale-95 shadow-[0_0_20px_rgba(46,204,113,0.3)] ${authLoading ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {authLoading ? '...' : t.loginBtn}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.code}</p>
                      <input
                        value={loginOtpCode}
                        onChange={(e) => setLoginOtpCode(e.target.value)}
                        className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all"
                        placeholder={t.codePlaceholder}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleSendLoginCode}
                        disabled={authLoading}
                        className={`py-4 rounded-2xl bg-white/5 text-white/70 font-black uppercase tracking-widest text-[10px] border border-white/10 ${authLoading ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {authLoading ? '...' : t.sendCode}
                      </button>
                      <button
                        onClick={handleVerifyLoginCode}
                        disabled={authLoading || !loginOtpCode.trim()}
                        className={`py-4 rounded-2xl bg-[#2ECC71] text-black font-black uppercase tracking-widest text-[10px] ${authLoading || !loginOtpCode.trim() ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {authLoading ? '...' : t.verify}
                      </button>
                    </div>
                    {loginOtpSent && (
                      <div className="p-3 rounded-2xl bg-white/5 text-white/50 text-xs">
                        {t.codeSent}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              // REGISTER VIEW
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.fullNamePlaceholder}</p>
                  <input 
                    value={tempName} 
                    onChange={(e) => setTempName(e.target.value)} 
                    className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all" 
                    placeholder={t.fullNamePlaceholder} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.email}</p>
                    <input 
                      type="email"
                      value={tempEmail} 
                      onChange={(e) => setTempEmail(e.target.value)} 
                      className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all" 
                      placeholder={t.emailPlaceholder} 
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.password}</p>
                    <input 
                      type="password"
                      value={tempPassword} 
                      onChange={(e) => setTempPassword(e.target.value)} 
                      className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all" 
                      placeholder={t.passwordPlaceholder} 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.confirmPassword}</p>
                  <input
                    type="password"
                    value={tempPasswordConfirm}
                    onChange={(e) => setTempPasswordConfirm(e.target.value)}
                    className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all"
                    placeholder={t.confirmPasswordPlaceholder}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.phone}</p>
                  <div className="flex">
                    <PhoneSelector value={tempPhoneDial} onChange={setTempPhoneDial} dark={true} t={t} />
                    <input 
                      value={tempPhone} 
                      onChange={(e) => { setTempPhone(e.target.value); }} 
                      className="w-full bg-white/5 p-4 rounded-r-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all" 
                      placeholder={PHONE_COUNTRIES.find(c => c.dial === tempPhoneDial)?.example || t.phonePlaceholder} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.birthDate}</p>
                    <input 
                      type="date"
                      value={tempBirthDate} 
                      onChange={(e) => setTempBirthDate(e.target.value)} 
                      className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all appearance-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.country}</p>
                    <CountrySelector 
                      value={tempCountry} 
                      onChange={setTempCountry} 
                      onLangChange={handleLangChange}
                      dark={true}
                      t={t}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleRegister}
                  disabled={authLoading}
                  className={`w-full py-5 bg-[#2ECC71] text-black font-black rounded-[24px] uppercase italic tracking-widest mt-4 transition-all active:scale-95 shadow-[0_0_20px_rgba(46,204,113,0.3)] ${authLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {authLoading ? '...' : t.registerBtn}
                </button>
              </div>
            )}

            <div className="pt-2">
              <div className="flex items-center gap-3 my-3">
                <div className="h-px bg-white/10 flex-1" />
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30">veya</div>
                <div className="h-px bg-white/10 flex-1" />
              </div>
              <button
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className={`w-full py-4 rounded-[24px] border border-white/10 bg-white/5 text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 shadow-sm hover:bg-white/10 transition active:scale-95 ${authLoading ? 'opacity-50 cursor-wait' : ''}`}
              >
                🌐 Google ile Giriş Yap
              </button>
            </div>
          </div>
        </div>
      </div>
      {emailVerifyOpen && (
        <div className="fixed inset-0 z-[12500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl p-6 bg-[#1a1a1a] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-black uppercase tracking-widest text-sm">E-posta Doğrulama</p>
              <button
                onClick={() => setEmailVerifyOpen(false)}
                className="text-white/60 text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-white/40 text-[11px] mb-4">Lütfen E-postanıza gelen kodu girin</p>
            <div className="text-white/30 text-[11px] font-bold mb-3">{tempEmail}</div>

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.code}</p>
                <input
                  value={emailVerifyCode}
                  onChange={(e) => setEmailVerifyCode(e.target.value)}
                  placeholder={t.codePlaceholder}
                  maxLength={6}
                  className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all text-center tracking-[0.5em] font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRegister}
                  disabled={emailVerifyLoading}
                  className={`py-4 rounded-2xl bg-white/5 text-white/70 font-black uppercase tracking-widest text-[10px] border border-white/10 ${emailVerifyLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {emailVerifyLoading ? '...' : t.sendCode}
                </button>
                <button
                  onClick={handleVerifyEmailAndCompleteRegister}
                  disabled={emailVerifyLoading || !emailVerifyCode.trim()}
                  className={`py-4 rounded-2xl bg-[#2ECC71] text-black font-black uppercase tracking-widest text-[10px] ${emailVerifyLoading || !emailVerifyCode.trim() ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {emailVerifyLoading ? '...' : t.verify}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {resetOpen && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl p-6 bg-[#1a1a1a] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-black uppercase tracking-widest text-sm">
                {recoveryOpen ? t.newPassword : t.forgotPassword}
              </p>
              <button
                onClick={() => { 
                  setResetOpen(false); 
                  if (!recoveryOpen) { 
                    setResetSent(false); 
                    setResetPhoneSent(false);
                    setResetPhoneCode('');
                  } 
                }}
                className="text-white/60 text-xl"
              >
                ✕
              </button>
            </div>

            {recoveryOpen ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.newPassword}</p>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t.newPasswordPlaceholder}
                    className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.confirmPassword}</p>
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder={t.confirmPasswordPlaceholder}
                    className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!newPassword || newPasswordConfirm !== newPassword) return showToast(t.passwordsNoMatch);
                    setAuthLoading(true);
                    try {
                      const { error } = await supabase.auth.updateUser({ password: newPassword });
                      if (error) throw error;
                      showToast(t.savePassword);
                      setRecoveryOpen(false);
                      setResetOpen(false);
                      setNewPassword('');
                      setNewPasswordConfirm('');
                      if (typeof window !== 'undefined') window.location.hash = '';
                    } catch (e) {
                      showToast(t.errorOccurred);
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading}
                  className={`w-full py-4 rounded-2xl bg-[#2ECC71] text-black font-black uppercase tracking-widest ${authLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {authLoading ? '...' : t.savePassword}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setResetUsePhone(false); setResetSent(false); setResetPhoneSent(false); }}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${!resetUsePhone ? 'bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/30' : 'bg-white/5 text-white/30 border-transparent'}`}
                  >
                    {t.resetByEmail}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetUsePhone(true); setResetSent(false); setResetPhoneSent(false); }}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${resetUsePhone ? 'bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/30' : 'bg-white/5 text-white/30 border-transparent'}`}
                  >
                    {t.resetByPhone}
                  </button>
                </div>

                {!resetUsePhone ? (
                  <>
                    <input
                      type="email"
                      value={resetTarget}
                      onChange={(e) => setResetTarget(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all"
                    />
                    <button
                      onClick={async () => {
                        if (!resetTarget.trim()) return alert(t.noName);
                        setAuthLoading(true);
                        try {
                          const { error } = await supabase.auth.resetPasswordForEmail(resetTarget.trim(), {
                            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
                          });
                          if (error) throw error;
                          setResetSent(true);
                        } catch (e) {
                          showToast(t.errorOccurred);
                        } finally {
                          setAuthLoading(false);
                        }
                      }}
                      disabled={authLoading}
                      className={`w-full py-4 rounded-2xl bg-[#2ECC71] text-black font-black uppercase tracking-widest ${authLoading ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {authLoading ? '...' : t.sendCode}
                    </button>
                    {resetSent && (
                      <div className="p-3 rounded-2xl bg-white/5 text-white/50 text-xs">
                        {t.checkEmail}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.phone}</p>
                      <div className="flex">
                        <PhoneSelector value={resetPhoneDial} onChange={setResetPhoneDial} dark={true} t={t} />
                        <input
                          value={resetPhone}
                          onChange={(e) => setResetPhone(e.target.value)}
                          className="w-full bg-white/5 p-4 rounded-r-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all"
                          placeholder={PHONE_COUNTRIES.find(c => c.dial === resetPhoneDial)?.example || t.phonePlaceholder}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-white/30 ml-2">{t.code}</p>
                      <input
                        value={resetPhoneCode}
                        onChange={(e) => setResetPhoneCode(e.target.value)}
                        className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-transparent focus:border-[#2ECC71] text-white text-sm transition-all"
                        placeholder={t.codePlaceholder}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={async () => {
                          const phone = normalizePhoneE164(resetPhoneDial, resetPhone);
                          if (!phone) return alert(t.noName);
                          setAuthLoading(true);
                          try {
                            const { error } = await supabase.auth.signInWithOtp({
                              phone,
                              options: { shouldCreateUser: false },
                            });
                            if (error) throw error;
                            setResetPhoneSent(true);
                            showToast(t.codeSent);
                          } catch (e) {
                            showToast(t.errorOccurred);
                          } finally {
                            setAuthLoading(false);
                          }
                        }}
                        disabled={authLoading}
                        className={`py-4 rounded-2xl bg-white/5 text-white/70 font-black uppercase tracking-widest text-[10px] border border-white/10 ${authLoading ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {authLoading ? '...' : t.sendCode}
                      </button>
                      <button
                        onClick={async () => {
                          const phone = normalizePhoneE164(resetPhoneDial, resetPhone);
                          if (!phone || !resetPhoneCode.trim()) return alert(t.noName);
                          setAuthLoading(true);
                          try {
                            const { error } = await supabase.auth.verifyOtp({
                              phone,
                              token: resetPhoneCode.trim(),
                              type: 'sms',
                            });
                            if (error) throw error;
                            setRecoveryOpen(true);
                          } catch (e) {
                            showToast(t.errorOccurred);
                          } finally {
                            setAuthLoading(false);
                          }
                        }}
                        disabled={authLoading || !resetPhoneCode.trim()}
                        className={`py-4 rounded-2xl bg-[#2ECC71] text-black font-black uppercase tracking-widest text-[10px] ${authLoading || !resetPhoneCode.trim() ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {authLoading ? '...' : t.verify}
                      </button>
                    </div>
                    {resetPhoneSent && (
                      <div className="p-3 rounded-2xl bg-white/5 text-white/50 text-xs">
                        {t.codeSent}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Client-side only - SSR sirasinda loading goster
  // Auth hydration bitmeden SADECE kullanici yoksa loading goster
  // localStorage'da kullanici varsa aninda goster, Supabase'i arka planda bekle
  if (!authInitialized && !user) {
    return (
      <main className="fixed inset-0 bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">Loading...</div>
      </main>
    );
  }

  return (
    <main 
      className={`w-screen overflow-hidden ${isDarkMode ? 'bg-[#0F0F0F] text-white' : 'bg-white text-black'} h-[100dvh]`}
    >
      <audio id="radar-remote-audio" autoPlay playsInline style={{ display: 'none' }} />
      <div className="relative w-full h-[100dvh]">
        {showNotifPrompt && (
          <div className="fixed left-1/2 -translate-x-1/2 top-6 z-[4000] w-[92%] max-w-md">
            <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-xs uppercase">Bildirimleri aç</p>
                <p className="text-white/60 text-[11px] font-bold truncate">Mesajları ve iş tekliflerini kaçırmamak için.</p>
              </div>
              <button onClick={requestNotifications} className="px-4 py-2 rounded-xl bg-[#2ECC71] text-black text-[11px] font-black uppercase">
                Aç
              </button>
              <button onClick={() => setShowNotifPrompt(false)} className="px-3 py-2 rounded-xl bg-white/10 text-white/70 text-[11px] font-black">
                ✕
              </button>
            </div>
          </div>
        )}
          <button 
          onClick={() => setAktifPage('menu')} 
          className={`fixed top-6 left-6 z-[3000] p-4 rounded-2xl backdrop-blur-xl shadow-[0_0_30px_rgba(255,255,255,0.06)] transition-transform hover:scale-105 ${isDarkMode ? 'bg-black/40 border border-white/10' : 'bg-white/75 border border-black/10'}`}
        >
          <div className={`w-6 h-0.5 mb-1.5 ${isDarkMode ? 'bg-white' : 'bg-black'}`}></div><div className={`w-6 h-0.5 mb-1.5 ${isDarkMode ? 'bg-white' : 'bg-black'}`}></div><div className={`w-4 h-0.5 ${isDarkMode ? 'bg-white' : 'bg-black'}`}></div>
        </button>
        {aktifIs && !chatAcik && (
          <button 
            onClick={() => setChatAcik(true)} 
            className="fixed top-6 right-6 z-[3000] px-5 py-3 rounded-2xl bg-[#2ECC71] text-white text-xs font-black uppercase flex items-center gap-2 shadow-lg">
            <div className="relative">
              {t.activeJob}
              <div className="absolute -top-1 -right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
            </div>
            {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center ml-1">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        )}
        {sentRequestId && !aktifIs && (
          <div className="absolute top-28 right-6 z-[3000] flex flex-col items-end gap-1">
            <span className="text-[10px] text-white/40 font-bold animate-pulse">⏳ {t.waiting}</span>
            <button onClick={handleOfferCancel} className="px-3 py-2 rounded-xl bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">✕ {t.cancelOffer}</button>
          </div>
        )}

        <div className="absolute inset-0 z-0 h-[100dvh] w-screen" onClick={() => setSeciliKisi(null)}>
          <MapView
            lat={konum?.lat}
            lng={konum?.lng}
            others={filteredDigerleri}
            onSelect={setSeciliKisi}
            onProfileClick={async (u) => {
              await handleProfilAc(u);
              setShowProfileModal(true);
            }}
            selectedId={seciliKisi?.user_id}
            dark={isDarkMode}
            activeJobUserIds={activeJobUserIds}
            currentUser={user}
            heading={heading}
            onResetRef={mapResetRef}
          />
        </div>

        <div className={`fixed inset-0 z-[5000] transition-opacity duration-300 ${aktifPage === 'menu' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className={`absolute inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-black/60' : 'bg-black/30'}`} onClick={() => setAktifPage('map')}></div>
          <div className={`absolute inset-y-5 left-5 w-[65%] max-w-[260px] shadow-2xl transform transition-transform duration-500 ease-out flex flex-col p-6 overflow-y-auto rounded-3xl ${isDarkMode ? 'border border-white/10 bg-black/40' : 'border border-black/20 bg-zinc-200'} backdrop-blur-md ${aktifPage === 'menu' ? 'translate-x-0' : '-translate-x-[120%]'}`}>
            <div className="flex items-center gap-4 mb-8 cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => { setAktifPage('account'); }}>
              <div className="w-14 h-14 bg-[#2ECC71]/20 rounded-full flex items-center justify-center text-xl font-bold text-[#2ECC71] shadow-[0_0_25px_rgba(46,204,113,0.18)]">{user.name[0].toUpperCase()}</div>
              <div className="flex-1">
                <p className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.name}</p>
                <p className="text-[#2ECC71] text-[10px] font-black uppercase">{t.myAccount}</p>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {['support', 'payment', 'history'].map(p => <button key={p} onClick={() => setAktifPage(p)} className={`w-full text-left py-3 px-2 font-semibold text-sm border-b transition-all hover:scale-[1.01] hover:bg-white/5 hover:shadow-[0_0_20px_rgba(255,255,255,0.06)] ${isDarkMode ? 'text-white border-white/10' : 'text-black border-black/10'}`}>{t[p]}</button>)}
              {user?.is_admin && (
                <button onClick={() => setAktifPage('admin')} className={`w-full text-left py-3 px-2 font-semibold text-sm border-b transition-all hover:scale-[1.01] hover:bg-red-500/10 ${isDarkMode ? 'text-red-400 border-white/10' : 'text-red-600 border-black/10'}`}>🛡 Admin Paneli</button>
              )}
            </div>
            <div className="mt-6 space-y-3">
              <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                <button onClick={() => setLangMenuAcik(!langMenuAcik)} className={`w-full flex justify-between items-center p-4 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  <span>{t.language}: {TRANSLATIONS[lang]?.flag} {TRANSLATIONS[lang]?.name}</span><span className={`transition-transform ${langMenuAcik ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {langMenuAcik && <div className="max-h-48 overflow-y-auto">{Object.entries(TRANSLATIONS).map(([code, tl]) => <button key={code} onClick={() => handleLangChange(code)} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${lang === code ? 'bg-[#2ECC71]/20 text-[#2ECC71] font-bold' : isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-black/5'}`}><span>{tl.flag}</span> {tl.name}</button>)}</div>}
              </div>
              <div className={`rounded-xl flex justify-between items-center px-4 py-3 ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{isDarkMode ? '☾ Koyu' : '☀ Açık'}</span>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-10 h-5 rounded-full transition-colors relative ${isDarkMode ? 'bg-[#2ECC71]' : 'bg-gray-400'}`}><div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow ${isDarkMode ? 'right-0.5' : 'left-0.5'}`}></div></button>
              </div>
              <button onClick={handleLogout} className="w-full p-4 bg-red-500/10 text-red-500 rounded-2xl font-bold text-sm">{t.logout}</button>
            </div>
          </div>
        </div>
        {aktifPage === 'support' && (
          <div className={`fixed inset-0 z-[6000] flex flex-col ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-zinc-200'}`}>
            <div className="flex items-center gap-4 p-6 pt-12"><button onClick={() => setAktifPage('menu')} className={`text-2xl ${isDarkMode ? 'text-white' : 'text-black'}`}>←</button><h2 className={`font-black text-xl uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.support}</h2></div>
            <div className="flex-1 overflow-y-auto px-6 pb-10">{[1, 2, 3].map(i => <Accordion key={i} title={t[`supportQ${i}`]} dark={isDarkMode}>{t[`supportA${i}`]}</Accordion>)}</div>
          </div>
        )}
        {aktifPage === 'account' && (
          <div className={`fixed inset-0 z-[6000] flex flex-col ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-zinc-200'}`}>
            <div className="flex items-center gap-4 p-6 pt-12">
              <button onClick={() => setAktifPage('menu')} className={`text-2xl ${isDarkMode ? 'text-white' : 'text-black'}`}>←</button>
              <h2 className={`font-black text-xl uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.myAccount}</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-6">
              {/* Profil Kartı - Fotoğraf tıklanabilir */}
              <div className={`rounded-3xl p-6 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-black/15'}`}>
                <div className="flex items-center gap-4 mb-4">
                  <input 
                    type="file" 
                    ref={profilePhotoInputRef} 
                    accept="image/*" 
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                  />
                  <div 
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="w-16 h-16 bg-[#2ECC71]/20 rounded-full flex items-center justify-center text-2xl font-bold text-[#2ECC71] cursor-pointer hover:bg-[#2ECC71]/30 transition-all overflow-hidden"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user.name[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <p className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.name}</p>
                  </div>
                </div>
              </div>
              
              {/* Kişisel Bilgiler */}
              <div className={`rounded-3xl p-6 space-y-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-black/10'}`}>
                <h3 className={`font-bold text-sm uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.personalInfo}</h3>
                
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-gray-400">{t.email}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.email}</p>
                    {user.email_verified || emailVerified ? (
                      <span className="text-[10px] bg-[#2ECC71]/20 text-[#2ECC71] px-2 py-1 rounded-full font-bold">✓ {t.verified}</span>
                    ) : (
                      <button onClick={() => handleSendEmailVerification()} className="text-[10px] bg-[#2ECC71] text-black px-3 py-1 rounded-full font-bold">{t.verify}</button>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowChangeEmailModal(true)}
                    className="text-[10px] text-[#2ECC71] underline mt-1"
                  >
                    {t.changeEmail}
                  </button>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-gray-400">{t.phone}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.phone || '-'}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-gray-400">{t.birthDate}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.birth_date || '-'}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-gray-400">{t.country}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.country || '-'}</p>
                </div>
              </div>
              
              {/* Açık Adres - Detaylı Form */}
              <div className={`rounded-3xl p-6 space-y-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-black/10'}`}>
                <h3 className={`font-bold text-sm uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.deliveryAddress}</h3>
                
                <div className="space-y-1 flex-shrink-0 min-w-0">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{t.addressLine1}</p>
                  <input 
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    onBlur={saveAddressToSupabase}
                    placeholder={t.streetAddress}
                    className={`w-full p-3 rounded-xl text-sm outline-none box-border border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500 border-white/10' : 'bg-zinc-200 text-zinc-900 border-zinc-400 placeholder-zinc-500'}`}
                    style={{ minWidth: 0 }}
                  />
                </div>
                
                <div className="space-y-1 flex-shrink-0 min-w-0">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{t.addressLine2}</p>
                  <input 
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    onBlur={saveAddressToSupabase}
                    placeholder={t.aptSuite}
                    className={`w-full p-3 rounded-xl text-sm outline-none box-border border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500 border-white/10' : 'bg-zinc-200 text-zinc-900 border-zinc-400 placeholder-zinc-500'}`}
                    style={{ minWidth: 0 }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 flex-shrink-0 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{t.city}</p>
                    <input 
                      type="text"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      onBlur={saveAddressToSupabase}
                      placeholder={t.cityPlaceholder}
                      className={`w-full p-3 rounded-xl text-sm outline-none box-border border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500 border-white/10' : 'bg-zinc-200 text-zinc-900 border-zinc-400 placeholder-zinc-500'}`}
                      style={{ minWidth: 0 }}
                    />
                  </div>
                  <div className="space-y-1 flex-shrink-0 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{t.district}</p>
                    <input 
                      type="text"
                      value={addressDistrict}
                      onChange={(e) => setAddressDistrict(e.target.value)}
                      onBlur={saveAddressToSupabase}
                      placeholder={t.districtPlaceholder}
                      className={`w-full p-3 rounded-xl text-sm outline-none box-border border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500 border-white/10' : 'bg-zinc-200 text-zinc-900 border-zinc-400 placeholder-zinc-500'}`}
                      style={{ minWidth: 0 }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 flex-shrink-0 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{t.neighborhood}</p>
                    <input 
                      type="text"
                      value={addressNeighborhood}
                      onChange={(e) => setAddressNeighborhood(e.target.value)}
                      onBlur={saveAddressToSupabase}
                      placeholder={t.neighborhoodPlaceholder}
                      className={`w-full p-3 rounded-xl text-sm outline-none box-border border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500 border-white/10' : 'bg-zinc-200 text-zinc-900 border-zinc-400 placeholder-zinc-500'}`}
                      style={{ minWidth: 0 }}
                    />
                  </div>
                  <div className="space-y-1 flex-shrink-0 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{t.postalCode}</p>
                    <input 
                      type="text"
                      value={addressPostalCode}
                      onChange={(e) => setAddressPostalCode(e.target.value)}
                      onBlur={saveAddressToSupabase}
                      placeholder={t.postalCodePlaceholder}
                      className={`w-full p-3 rounded-xl text-sm outline-none box-border border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500 border-white/10' : 'bg-zinc-200 text-zinc-900 border-zinc-400 placeholder-zinc-500'}`}
                      style={{ minWidth: 0 }}
                    />
                  </div>
                </div>
                
                <button 
                  onClick={handleSaveAddress}
                  disabled={profileEditLoading}
                  className="w-full py-3 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50 mt-2 flex-shrink-0"
                >
                  {profileEditLoading ? '...' : t.saveAddress}
                </button>
              </div>
              
              {/* Hizmet Veren (Provider) Bölümü */}
              <div className={`rounded-3xl p-6 space-y-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
                <h3 className={`font-bold text-sm uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>Hizmet Veren Paneli</h3>
                <p className={`text-xs opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  İş yaparak para kazanmak istiyorsan Stripe hesabın ile bağlan.
                </p>
                
                {!isProvider ? (
                  <button 
                    onClick={() => setAktifPage('provider')}
                    className="w-full py-4 bg-gradient-to-r from-[#2ECC71] to-[#27ae60] text-black rounded-2xl font-black text-sm hover:scale-[1.02] transition-transform"
                  >
                    💼 Çalışmak İstiyorum
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <p className={`text-xs opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>Toplam Kazanç</p>
                      <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>{providerEarnings}₺</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setAktifPage('provider')}
                        className="flex-1 py-3 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm"
                      >
                        Stripe Hesabım
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {aktifPage === 'history' && (
          <div className={`fixed inset-0 z-[6000] flex flex-col ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-zinc-200'}`}>
            <div className="flex items-center gap-4 p-6 pt-12">
              <button onClick={() => setAktifPage('menu')} className={`text-2xl ${isDarkMode ? 'text-white' : 'text-black'}`}>←</button>
              <h2 className={`font-black text-xl uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.history}</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-10">
              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin w-8 h-8 border-2 border-[#2ECC71] border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* İşlemler Bölümü */}
                  <div>
                    <h3 className={`font-bold text-sm uppercase mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>İşlemler</h3>
                    {userHistory.transactions.length === 0 ? (
                      <p className={`text-sm opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>Henüz işlem bulunmuyor.</p>
                    ) : (
                      <div className="space-y-3">
                        {userHistory.transactions.map((transaction, idx) => (
                          <div key={idx} className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-black/10'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${transaction.type === 'deposit' ? 'bg-[#2ECC71]/20 text-[#2ECC71]' : 'bg-red-500/20 text-red-500'}`}>
                                  {transaction.type === 'deposit' ? '↓' : '↑'}
                                </div>
                                <div>
                                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
                                    {transaction.type === 'deposit' ? 'Para Yatırma' : 'Para Çekme'}
                                  </p>
                                  <p className="text-[10px] opacity-60">{new Date(transaction.created_at).toLocaleDateString('tr-TR')}</p>
                                </div>
                              </div>
                              <p className={`font-bold text-lg ${transaction.type === 'deposit' ? 'text-[#2ECC71]' : 'text-red-500'}`}>
                                {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount}₺
                              </p>
                            </div>
                            <p className={`text-xs mt-2 opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`}>{transaction.description || ''}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tamamlanan İşler Bölümü */}
                  <div>
                    <h3 className={`font-bold text-sm uppercase mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Tamamlanan İşler</h3>
                    {userHistory.completedJobs.length === 0 ? (
                      <p className={`text-sm opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>Henüz tamamlanan iş bulunmuyor.</p>
                    ) : (
                      <div className="space-y-3">
                        {userHistory.completedJobs.map((job, idx) => (
                          <div key={idx} className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-black/10'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>İş #{job.id?.slice(0, 8)}</p>
                              <p className="text-[10px] opacity-60">{new Date(job.updated_at).toLocaleDateString('tr-TR')}</p>
                            </div>
                            <p className={`text-xs mb-2 opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`}>{job.details || job.description || 'Detay yok'}</p>
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] px-2 py-1 rounded-full bg-[#2ECC71]/20 text-[#2ECC71]`}>Tamamlandı</span>
                              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>{job.price || 0}₺</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {aktifPage === 'payment' && (
          <div className={`fixed inset-0 z-[6000] flex flex-col ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-zinc-200'}`}>
            <div className="flex items-center gap-4 p-6 pt-12">
              <button onClick={() => setAktifPage('menu')} className={`text-2xl ${isDarkMode ? 'text-white' : 'text-black'}`}>←</button>
              <h2 className={`font-black text-xl uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.payment}</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-10">
              {/* Bakiye Kartı */}
              <div className={`rounded-3xl p-6 mb-6 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-black/10'}`}>
                <p className={`text-sm opacity-60 mb-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>Mevcut Bakiye</p>
                <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>{walletBalance}₺</p>
              </div>

              {/* Para Yatırma */}
              <div className={`rounded-3xl p-6 mb-6 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-black/10'}`}>
                <h3 className={`font-bold text-sm uppercase mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Para Yatır</h3>
                
                {/* Komisyon bilgisi */}
                <div className={`mb-4 p-3 rounded-lg text-xs ${isDarkMode ? 'bg-white/5 text-white/70' : 'bg-zinc-200 text-black/70'}`}>
                  <p>Komisyon: min 10₺ veya %3.5</p>
                  {paymentAmount > 0 && (
                    <p className="mt-1 text-[#2ECC71]">
                      {(() => {
                        const amt = parseFloat(paymentAmount) || 0;
                        const commission = Math.max(10, amt * 0.035);
                        return `Yatırılan: ${amt}₺ | Komisyon: ${commission.toFixed(2)}₺ | Net: ${(amt - commission).toFixed(2)}₺`;
                      })()}
                    </p>
                  )}
                </div>

                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Miktar (₺)"
                  className={`w-full p-4 rounded-xl text-lg mb-4 outline-none border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500 border-white/10' : 'bg-zinc-200 text-black border-black/20'}`}
                />
                <button
                  onClick={async () => {
                    if (!paymentAmount || paymentAmount <= 0) return;
                    setPaymentLoading(true);
                    try {
                      const { data: { session: sess } } = await supabase.auth.getSession();
                      const res = await fetch('/api/payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sess?.access_token}` },
                        body: JSON.stringify({ amount: paymentAmount, userId: user.id })
                      });
                      const data = await res.json();
                      if (data.clientSecret) {
                        setClientSecret(data.clientSecret);
                      }
                    } catch (e) {
                      showToast('Ödeme başlatılamadı');
                    } finally {
                      setPaymentLoading(false);
                    }
                  }}
                  disabled={paymentLoading || !paymentAmount}
                  className="w-full py-4 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50"
                >
                  {paymentLoading ? 'Yükleniyor...' : 'Kart ile Öde'}
                </button>

                {clientSecret && (
                  <div className="mt-4 p-4 rounded-xl border border-[#2ECC71]/30 bg-[#2ECC71]/5 space-y-3">
                    <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-black'}`}>Kart bilgilerinizi girin:</p>
                    <input
                      type="text"
                      placeholder="Kart Numarası (4242 4242 4242 4242)"
                      maxLength={19}
                      className={`w-full p-3 rounded-lg border text-sm outline-none ${isDarkMode ? 'bg-white/10 border-white/20 text-white placeholder-gray-500' : 'bg-white border-black/20 text-black'}`}
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="AA/YY"
                        maxLength={5}
                        className={`flex-1 p-3 rounded-lg border text-sm outline-none ${isDarkMode ? 'bg-white/10 border-white/20 text-white placeholder-gray-500' : 'bg-white border-black/20 text-black'}`}
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        maxLength={3}
                        className={`flex-1 p-3 rounded-lg border text-sm outline-none ${isDarkMode ? 'bg-white/10 border-white/20 text-white placeholder-gray-500' : 'bg-white border-black/20 text-black'}`}
                      />
                    </div>
                    {paymentAmount > 0 && (
                      <p className={`text-xs ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>
                        {(() => {
                          const amt = parseFloat(paymentAmount) || 0;
                          const commission = Math.max(10, amt * 0.035);
                          const net = amt - commission;
                          return `Kartınızdan çekilecek: ${amt}₺ | Bakiyenize geçecek: ${net.toFixed(2)}₺ | Komisyon: ${commission.toFixed(2)}₺`;
                        })()}
                      </p>
                    )}
                    <button
                      onClick={async () => {
                        const amt = parseFloat(paymentAmount) || 0;
                        const commission = Math.max(10, amt * 0.035);
                        const net = amt - commission;
                        
                        // API'ye kayıt gönder
                        try {
                          const { data: { session: sessPut } } = await supabase.auth.getSession();
                          await fetch('/api/payment', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessPut?.access_token}` },
                            body: JSON.stringify({
                              userId: user.id,
                              amount: amt,
                              commission: commission,
                              netAmount: net,
                              status: 'completed'
                            })
                          });
                          
                          // Geçmişi güncelle
                          setUserHistory(prev => ({
                            ...prev,
                            transactions: [{
                              type: 'deposit',
                              amount: net,
                              commission: commission,
                              total_amount: amt,
                              description: `Para yatırma (Komisyon: ${commission.toFixed(2)}₺)`,
                              created_at: new Date().toISOString()
                            }, ...prev.transactions]
                          }));
                          
                          showToast(`Ödeme başarılı! ${net.toFixed(2)}₺ bakiyenize eklendi (Komisyon: ${commission.toFixed(2)}₺)`);
                        } catch (e) {
                          showToast('Ödeme kaydedildi ancak geçmiş güncellenemedi');
                        }
                        
                        setClientSecret('');
                        setPaymentAmount('');
                        setWalletBalance(prev => prev + net);
                      }}
                      className="w-full py-3 bg-[#2ECC71] text-black rounded-xl font-bold text-sm"
                    >
                      Ödemeyi Tamamla
                    </button>
                  </div>
                )}
              </div>

              {/* Para Gönder */}
              <div className={`rounded-3xl p-6 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-black/10'}`}>
                <h3 className={`font-bold text-sm uppercase mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Para Gönder</h3>

                {/* Komisyon bilgisi */}
                <div className={`mb-4 p-3 rounded-lg text-xs ${isDarkMode ? 'bg-white/5 text-white/70' : 'bg-zinc-200 text-black/70'}`}>
                  <p>Transfer komisyonu: min 5₺ veya %1.5</p>
                  {transferAmount > 0 && (
                    <p className="mt-1 text-[#2ECC71]">
                      {(() => {
                        const amt = parseFloat(transferAmount) || 0;
                        const commission = Math.max(5, amt * 0.015);
                        return `Gönderilen: ${amt}₺ | Komisyon: ${commission.toFixed(2)}₺ | Alıcıya geçecek: ${(amt - commission).toFixed(2)}₺`;
                      })()}
                    </p>
                  )}
                </div>

                <input
                  type="tel"
                  value={transferPhone}
                  onChange={(e) => setTransferPhone(e.target.value)}
                  placeholder="Telefon numarası"
                  className={`w-full p-4 rounded-xl text-sm mb-3 outline-none border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500 border-white/10' : 'bg-white text-black border-black/20'}`}
                />
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder={`Gönderilecek miktar (${transferCurrency})`}
                  className={`w-full p-4 rounded-xl text-sm mb-4 outline-none border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500 border-white/10' : 'bg-white text-black border-black/20'}`}
                />
                <button
                  onClick={async () => {
                    if (!transferPhone || !transferAmount) return;
                    const amt = parseFloat(transferAmount) || 0;
                    const commission = Math.max(5, amt * 0.015);
                    const totalNeeded = amt; // Gönderen komisyonlu öder
                    if (totalNeeded > walletBalance) {
                      showToast('Yetersiz bakiye! (Komisyon dahil: ' + totalNeeded.toFixed(2) + '₺)');
                      return;
                    }
                    setTransferLoading(true);
                    try {
                      const { data: { session: sessTr } } = await supabase.auth.getSession();
                      const res = await fetch('/api/transfer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessTr?.access_token}` },
                        body: JSON.stringify({
                          fromUserId: user.id,
                          phone: transferPhone,
                          amount: amt,
                          description: 'Para transferi'
                        })
                      });
                      const data = await res.json();
                      if (data.success) {
                        const receiverGets = amt - commission;
                        
                        // Geçmişi güncelle
                        setUserHistory(prev => ({
                          ...prev,
                          transactions: [{
                            type: 'withdrawal',
                            amount: amt,
                            commission: commission,
                            total_amount: amt,
                            description: `Transfer: ${transferPhone} (Komisyon: ${commission.toFixed(2)}₺)`,
                            created_at: new Date().toISOString()
                          }, ...prev.transactions]
                        }));
                        
                        showToast(`Para gönderildi! Alıcı ${receiverGets.toFixed(2)}₺ aldı (Komisyon: ${commission.toFixed(2)}₺)`);
                        setWalletBalance(prev => prev - totalNeeded);
                        setTransferPhone('');
                        setTransferAmount('');
                      } else {
                        showToast(data.error || 'Transfer başarısız');
                      }
                    } catch (e) {
                      showToast('Transfer hatası');
                    } finally {
                      setTransferLoading(false);
                    }
                  }}
                  disabled={transferLoading || !transferPhone || !transferAmount}
                  className="w-full py-4 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50"
                >
                  {transferLoading ? 'Gönderiliyor...' : 'Para Gönder'}
                </button>
              </div>
            </div>
          </div>
        )}
        {aktifPage === 'provider' && (
          <div className={`fixed inset-0 z-[6000] flex flex-col ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-white'}`}>
            <div className="flex items-center gap-4 p-6 pt-12">
              <button onClick={() => setAktifPage('account')} className={`text-2xl ${isDarkMode ? 'text-white' : 'text-black'}`}>←</button>
              <h2 className={`font-black text-xl uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>Hizmet Veren Paneli</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-10">
              {!stripeConnected ? (
                <div className="space-y-6">
                  {/* Basit Açıklama */}
                  <div className={`rounded-3xl p-6 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-black/10'}`}>
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-[#635BFF]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-3xl">💳</span>
                      </div>
                      <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>Para Kazanmaya Başla</h3>
                    </div>
                    <p className={`text-sm opacity-70 text-center mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      İş yaparak para kazanmak için Stripe hesabını bağla. 
                      Müşteriler ödeme yaptığında para direkt hesabına gider.
                    </p>
                  </div>

                  {/* TEK BUTON - Stripe Connect (GERÇEK) */}
                  <button
                    onClick={async () => {
                      if (!user?.id) {
                        showToast('Önce giriş yapmalısın!');
                        return;
                      }
                      
                      setProviderLoading(true);
                      showToast('🔗 Stripe bağlantısı başlatılıyor...');
                      
                      try {
                        const { data: { session: sessStr } } = await supabase.auth.getSession();
                        const res = await fetch('/api/stripe/connect', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessStr?.access_token}` },
                          body: JSON.stringify({ userId: user.id })
                        });
                        
                        const data = await res.json();
                        
                        if (data.url) {
                          // Stripe OAuth sayfasına yönlendir
                          window.location.href = data.url;
                        } else {
                          showToast('Hata: ' + (data.error || 'Bilinmeyen hata'));
                        }
                      } catch (e) {
                        showToast('Bağlantı hatası: ' + e.message);
                      } finally {
                        setProviderLoading(false);
                      }
                    }}
                    disabled={providerLoading}
                    className="w-full py-5 bg-[#635BFF] text-white rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform shadow-lg shadow-[#635BFF]/30 disabled:opacity-50"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {providerLoading ? '⏳ Yükleniyor...' : <><span>⚡</span> Stripe ile Bağlan</>}
                    </span>
                  </button>

                  {/* Nasıl Çalışır - Sadeleştirilmiş */}
                  <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs opacity-60 mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>Nasıl Çalışır?</p>
                    <div className="space-y-2 text-xs opacity-70">
                      <p>1️⃣ Butona bas, Stripe'a git</p>
                      <p>2️⃣ Giriş yap veya hesap oluştur</p>
                      <p>3️⃣ İzin ver, geri dön</p>
                      <p>4️⃣ İş yap, para kazan! 🎉</p>
                    </div>
                  </div>

                  {/* Sorun mu var? */}
                  <div className="text-center">
                    <button 
                      onClick={() => window.open('https://stripe.com', '_blank')}
                      className={`text-xs underline opacity-50 ${isDarkMode ? 'text-white' : 'text-black'}`}
                    >
                      Stripe hesabım yok, önce oluşturmak istiyorum
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Bağlı Hesap Bilgisi */}
                  <div className={`rounded-3xl p-6 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-black/10'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-[#2ECC71] rounded-full animate-pulse"></div>
                      <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Stripe Bağlı</p>
                    </div>
                    <p className={`text-sm opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      Hesabın aktif. İş yaptığında para direkt Stripe hesabına gider.
                    </p>
                  </div>

                  {/* Kazanç Özeti */}
                  <div className={`rounded-3xl p-6 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-black/10'}`}>
                    <h3 className={`font-bold text-sm uppercase mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Kazanç Özeti</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/10' : 'bg-white'}`}>
                        <p className="text-xs opacity-60">Bu Ay</p>
                        <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>0₺</p>
                      </div>
                      <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/10' : 'bg-white'}`}>
                        <p className="text-xs opacity-60">Toplam</p>
                        <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>{providerEarnings}₺</p>
                      </div>
                    </div>
                  </div>

                  {/* Stripe Dashboard */}
                  <button
                    onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                    className="w-full py-4 bg-[#635BFF] text-white rounded-2xl font-bold text-sm hover:scale-[1.02] transition-transform"
                  >
                    Stripe Dashboard'a Git →
                  </button>

                  {/* Bağlantıyı Kes */}
                  <button
                    onClick={() => {
                      setStripeConnected(false);
                      setIsProvider(false);
                      showToast('Stripe bağlantısı kesildi.');
                    }}
                    className="w-full py-3 bg-red-500/10 text-red-500 rounded-2xl font-bold text-sm"
                  >
                    Bağlantıyı Kes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {aktifPage === 'admin' && user?.is_admin && (
          <AdminPanel
            isDarkMode={isDarkMode}
            onClose={() => setAktifPage('menu')}
            supabase={supabase}
          />
        )}
        <div className={`fixed bottom-0 left-0 right-0 rounded-t-[40px] z-[3000] transition-transform duration-500 ${isDarkMode ? 'bg-[#121212]' : 'bg-slate-200/90 backdrop-blur-xl border border-black/10 shadow-2xl'}`} style={{ transform: (sheetYukseklik === 1 && !seciliKisi) ? 'translateY(80%)' : 'translateY(0)' }}>
          <div className="w-full py-4 flex justify-center cursor-pointer" onClick={() => setSheetYukseklik(sheetYukseklik === 0 ? 1 : 0)}><div className={`w-12 h-1.5 rounded-full ${isDarkMode ? 'bg-gray-500/30' : 'bg-black/15'}`}></div></div>
          <div className="px-6 pb-10">
            {seciliKisi ? (
              <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-4 mb-4">
                  <button onClick={() => handleProfilAc(seciliKisi)} className="w-16 h-16 bg-gray-500/10 rounded-3xl flex items-center justify-center text-4xl">{HIZMETLER[seciliKisi.user_role]?.emoji || '👤'}</button>
                  <div className="flex-1"><h3 className={`font-black text-xl uppercase italic ${isDarkMode ? 'text-white' : 'text-black'}`}>{seciliKisi.name}</h3><p className="text-[10px] font-bold text-[#2ECC71] uppercase">{t[seciliKisi.user_role === 'musteri' ? 'customer' : seciliKisi.user_role === 'emanetci' ? 'emanci' : seciliKisi.user_role === 'kurye' ? 'courier' : 'waiter']}</p></div>
                </div>
                {!aktifIs && (
                  <><div className="space-y-3 mb-4"><input value={isDetayi} onChange={(e) => setIsDetayi(e.target.value)} placeholder={t.jobDetail} className={`w-full p-4 rounded-2xl border border-transparent outline-none focus:border-[#2ECC71] text-sm ${isDarkMode ? 'bg-gray-500/5 text-white placeholder-gray-500' : 'bg-gray-100 text-black'}`} /><div className="relative"><input type="number" value={teklifFiyat} onChange={(e) => setTeklifFiyat(e.target.value)} placeholder={t.offerPrice} className={`w-full p-4 rounded-2xl border border-transparent outline-none focus:border-[#2ECC71] text-sm ${isDarkMode ? 'bg-gray-500/5 text-white placeholder-gray-500' : 'bg-gray-100 text-black'}`} />{calcSuggestedPrice(getDistance(konum?.lat, konum?.lng, seciliKisi.lat, seciliKisi.lng), seciliKisi.user_role) && !teklifFiyat && <button onClick={() => setTeklifFiyat(String(calcSuggestedPrice(getDistance(konum?.lat, konum?.lng, seciliKisi.lat, seciliKisi.lng), seciliKisi.user_role)))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#2ECC71] bg-[#2ECC71]/10 px-2 py-1 rounded-lg">{t.priceSuggestion}: ₺{calcSuggestedPrice(getDistance(konum?.lat, konum?.lng, seciliKisi.lat, seciliKisi.lng), seciliKisi.user_role)}</button>}</div></div><button onClick={handleTalepGonder} disabled={talepGonderiliyor} className="w-full py-5 rounded-[24px] bg-[#2ECC71] text-black font-black text-lg uppercase italic disabled:opacity-60">{talepGonderiliyor ? t.sending : t.sendJob}</button></>
                )}
                {aktifIs && (aktifIs.sender_id === seciliKisi.user_id || aktifIs.receiver_id === seciliKisi.user_id) && <button onClick={() => setChatAcik(true)} className="w-full py-4 rounded-[24px] bg-[#e67e22] text-white font-black text-sm uppercase mt-2">💬 {t.chat}</button>}
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in-95">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: 'kurye', emoji: '📦', label: t.fastCourier, desc: t.courierDesc, color: '#fbbf24' },
                    { key: 'emanetci', emoji: '💼', label: t.custodian, desc: t.custodianDesc, color: '#3b82f6' },
                    { key: 'siraci', emoji: '⏳', label: t.waitInLine, desc: t.waitDesc, color: '#22c55e' },
                    { key: 'hepsi', emoji: '🌍', label: t.all, desc: t.allDesc, color: '#9333ea' }
                  ].map(({ key, emoji, label, desc, color }) => (
                    <div 
                      key={key} 
                      onClick={() => setAktifFiltre(key)}
                      className={`p-3 rounded-[20px] border-2 flex flex-col justify-between transition-all cursor-pointer ${
                        aktifFiltre === key 
                          ? 'border-[#2ECC71] bg-[#2ECC71]/5' 
                          : `border-transparent ${isDarkMode ? 'bg-gray-500/5' : 'bg-white border border-black/10'}`
                      }`}
                    >
                      <span className="text-xl mb-1">{emoji}</span>
                      <p className={`font-black text-[9px] uppercase italic ${isDarkMode ? 'text-white' : 'text-black'}`}>{label}</p>
                      <p className={`text-[7px] font-bold uppercase mt-1 leading-tight ${isDarkMode ? 'opacity-40' : 'text-black/50'}`}>{desc}</p>
                    </div>
                  ))}
                </div>
                <p className={`mt-6 text-center text-[10px] font-bold opacity-20 uppercase italic tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.tagline}</p>
              </div>
            )}
          </div>
        </div>
        {gelenTalep && (
          <div className="fixed inset-0 z-[8000] flex items-end justify-center p-6 pointer-events-none"><div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-8 ${isDarkMode ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white border border-black/10'}`}><p className="text-[#2ECC71] font-black text-xs uppercase mb-2">📨 {t.incomingRequest}</p><p className={`font-bold text-lg mb-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>{gelenTalep.senderName}</p>{gelenTalep.title && <p className={`text-sm mb-1 opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>{gelenTalep.title}</p>}{gelenTalep.price && <p className="text-[#2ECC71] font-bold text-sm mb-4">₺{gelenTalep.price}</p>}<OfferCountdown createdAt={gelenTalep.created_at} dark={isDarkMode} /><div className="flex gap-3 mt-3"><button onClick={handleTalepKabul} className="flex-1 py-4 bg-[#2ECC71] text-black font-black rounded-2xl uppercase text-sm">{t.accept}</button><button onClick={handleTalepRed} className="flex-1 py-4 bg-red-500/10 text-red-500 font-black rounded-2xl uppercase text-sm">{t.reject}</button></div></div></div>
        )}
        {chatAcik && aktifIs && (
          <div className={`fixed inset-0 z-[7000] flex flex-col ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-white'}`}>
            <div className={`flex items-center gap-4 p-4 pt-12 border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}><button onClick={() => setChatAcik(false)} className={`text-2xl ${isDarkMode ? 'text-white' : 'text-black'}`}>←</button><div className="flex-1 min-w-0"><p className={`font-black text-sm uppercase truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>{aktifIs.title || t.activeJob}</p>{aktifIs.price && <p className="text-[#2ECC71] text-xs">₺{aktifIs.price}</p>}</div><div className="flex items-center gap-2 flex-shrink-0">{['idle', 'ended', 'missed'].includes(callState) ? <button onClick={handleStartCall} className="w-9 h-9 rounded-full bg-[#2ECC71]/20 text-[#2ECC71] flex items-center justify-center text-lg">📞</button> : callState === 'connected' ? <button onClick={handleEndCall} className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center text-lg animate-pulse">📵</button> : <span className="text-[10px] text-[#2ECC71] font-bold animate-pulse">📞...</span>}{!aktifIs[isSender ? 'sender_confirmed' : 'receiver_confirmed'] ? <button onClick={handleOnayla} className="px-3 py-2 bg-[#2ECC71]/20 text-[#2ECC71] rounded-xl text-xs font-bold whitespace-nowrap">{t.confirmJob}</button> : <span className="text-[#2ECC71] text-xs font-bold">{t.youConfirmed}</span>}</div></div>
            
            {/* SABİT HATIRLATMA MESAJI - DARALTILMIŞ */}
            <div className="mx-auto my-2 px-6 py-4 bg-[#2ECC71]/10 border border-[#2ECC71]/30 rounded-3xl backdrop-blur-xl shadow-lg z-[8000] max-w-[85%]">
              <p className="text-[#2ECC71] text-[10px] font-black leading-relaxed text-center uppercase italic tracking-widest">
                Lütfen aldığınız veya teslim ettiğiniz paketlerin görsellerini hem iş başında hem de iş sonunda görsellerini atmayı unutmayınız.
              </p>
            </div>

            {bothConfirmedFlag && (
              <div className="mx-auto mb-2 py-3 px-4 rounded-2xl bg-[#2ECC71]/10 border border-[#2ECC71]/30 flex flex-col items-center justify-center shadow-sm backdrop-blur-md max-w-[70%]">
                <p className="text-[#2ECC71] text-[11px] font-black uppercase tracking-widest mb-2">
                  {t.bothConfirmed}
                </p>
                {/* Değerlendirme Butonu */}
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-4 py-2 bg-[#2ECC71] text-black rounded-xl text-[10px] font-black uppercase hover:bg-[#2ECC71]/90 transition-all"
                >
                  ⭐ {t.rateTitle}
                </button>
              </div>
            )}
            {deliveryCode && <div className={`px-4 py-2 border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-black/5 bg-black/5'}`}>{isSender ? <div className="flex items-center gap-2"><span className={`text-xs font-bold flex-shrink-0 ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{t.deliveryCode}:</span><input value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder={t.enterCode} className={`flex-1 px-3 py-1.5 rounded-xl text-xs outline-none min-w-0 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`} /><button onClick={handleVerifyCode} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 ${codeVerified ? 'bg-[#2ECC71] text-black' : 'bg-[#2ECC71]/20 text-[#2ECC71]'}`}>{codeVerified ? t.codeVerified : t.verifyCode}</button></div> : <div className="flex items-center gap-2"><span className={`text-xs font-bold ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{t.deliveryCode}:</span><span className="text-[#2ECC71] font-black text-lg tracking-widest">{deliveryCode}</span><span className={`text-[10px] opacity-50 ${isDarkMode ? 'text-white' : 'text-black'}`}>({t.codeGenerated})</span></div>}</div>}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0F0F0F]/50">
               {mesajlar.map(m => (
                 <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[75%] rounded-2xl overflow-hidden shadow-sm ${m.sender_id === user.id ? 'bg-[#2ECC71] text-black rounded-br-sm' : isDarkMode ? 'bg-white/10 text-white rounded-bl-sm border border-white/5' : 'bg-gray-100 text-black rounded-bl-sm'}`}>
                     {m.type === 'image' ? <img src={m.content} alt="img" className="max-w-full" style={{ maxHeight: 200 }} /> : m.type === 'audio' ? <div className="px-4 py-3"><audio controls src={m.content} style={{ height: 36 }} /></div> : <p className="px-4 py-3 text-sm font-medium">{m.content}</p>}
                   </div>
                 </div>
               ))}
               {karsiYaziyor && <div className="flex justify-start"><div className={`px-4 py-3 rounded-2xl rounded-bl-sm text-[10px] font-bold italic opacity-60 flex items-center gap-2 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-black'}`}><span className="flex gap-1"><span className="w-1 h-1 bg-current rounded-full animate-bounce"></span><span className="w-1 h-1 bg-current rounded-full animate-bounce delay-75"></span><span className="w-1 h-1 bg-current rounded-full animate-bounce delay-150"></span></span> {t.typing}</div></div>}
               <div ref={chatBottomRef} />
             </div>

            {/* HIZLI CEVAP BUTONLARI */}
            {chatAcik && (
              <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-white/5">
                {[t.onMyWay, t.arrivedEmoji, t.doneEmoji, t.atLocation, t.thanksEmoji].map(txt => (
                  <button 
                    key={txt} 
                    onClick={() => { setYeniMesaj(txt); }}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isDarkMode ? 'bg-white/5 text-white/60 border border-white/5 hover:bg-[#2ECC71]/20 hover:text-[#2ECC71]' : 'bg-gray-100 text-black/60'}`}
                  >
                    {txt}
                  </button>
                ))}
              </div>
            )}

            {bothConfirmedFlag && <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">{currentStage === 'accepted' && <button onClick={() => handleAdvanceStage('arrived')} className="flex-shrink-0 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase border border-blue-500/20 shadow-lg">📍 {t.stageArrived}</button>}{currentStage === 'arrived' && <button onClick={() => handleAdvanceStage('picked_up')} className="flex-shrink-0 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-xl text-[10px] font-black uppercase border border-orange-500/20 shadow-lg">📦 {t.stagePickedUp}</button>}{currentStage === 'picked_up' && <button onClick={() => handleAdvanceStage('delivered')} className="flex-shrink-0 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-[10px] font-black uppercase border border-purple-500/20 shadow-lg">🏠 {t.stageDelivered}</button>}</div>}
             <div className={`flex items-center gap-2 p-4 border-t ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}><input type="file" ref={fileInputRef} accept="image/*" onChange={handleFotoGonder} className="hidden" /><button onClick={() => fileInputRef.current?.click()} className={`p-3 rounded-xl text-lg flex-shrink-0 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>📷</button><VoiceMsgRecorder onSend={handleVoiceMsgSend} dark={isDarkMode} t={t} /><input value={yeniMesaj} onChange={(e) => handleTypingInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleMesajGonder()} placeholder={t.msgPlaceholder} className={`flex-1 px-4 py-3 rounded-2xl text-sm outline-none min-w-0 ${isDarkMode ? 'bg-white/5 text-white placeholder-gray-500' : 'bg-gray-100 text-black'}`} /><button onClick={handleMesajGonder} disabled={mesajGonderiliyor || !yeniMesaj.trim()} className="p-3 rounded-xl bg-[#2ECC71] text-black font-bold text-sm disabled:opacity-40">↑</button></div>
          </div>
        )}
        {callState === 'incoming' && incomingCallPayload && (
          <div className="fixed inset-0 z-[9500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"><div className={`w-full max-w-sm rounded-3xl p-8 text-center ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}><div className="text-5xl mb-4 animate-bounce">📞</div><p className={`font-black text-xl mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.callIncoming}</p><div className="flex gap-4"><button onClick={handleDeclineCall} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl">{t.callDecline}</button><button onClick={handleAcceptCall} className="flex-1 py-4 bg-[#2ECC71] text-black font-black rounded-2xl">{t.callAccept}</button></div></div></div>
        )}
        {photoProofRequired && (
          <div className="fixed inset-0 z-[9200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"><div className={`w-full max-w-sm rounded-3xl p-6 text-center ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}><div className="text-4xl mb-4">📸</div><p className={`font-black text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.photoProof}</p><p className={`text-xs mb-6 opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.photoRequired}</p><div className="flex gap-3"><button onClick={() => setPhotoProofRequired(false)} className={`flex-1 py-3 rounded-2xl font-bold text-sm ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}>✕</button><button onClick={() => proofFileInputRef.current?.click()} className="flex-1 py-3 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm">📷</button></div></div></div>
        )}
        {reviewAcik && (
          <div className="fixed inset-0 z-[9000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"><div className={`w-full max-w-sm rounded-3xl p-6 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}><h3 className={`font-black text-xl text-center mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>🎉 {t.jobCompleted}</h3><p className={`text-center text-sm mb-4 opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.rateTitle}</p><StarRating value={reviewPuan} onChange={setReviewPuan} /><textarea value={reviewYorum} onChange={(e) => setReviewYorum(e.target.value)} placeholder={t.commentPlaceholder} rows={3} className={`w-full p-4 rounded-2xl text-sm outline-none resize-none mb-4 ${isDarkMode ? 'bg-white/5 text-white placeholder-gray-500' : 'bg-gray-100 text-black'}`} /><button onClick={handleReviewGonder} className="w-full py-4 bg-[#2ECC71] text-black font-black rounded-2xl uppercase">{t.submitReview}</button></div></div>
        )}
        {profilKisi && (
          <div className="fixed inset-0 z-[8500] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setProfilKisi(null)}><div className={`w-full max-w-lg rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`} onClick={e => e.stopPropagation()}><div className="flex items-center gap-4 mb-4"><div className="w-14 h-14 bg-[#2ECC71]/20 rounded-full flex items-center justify-center text-2xl">{HIZMETLER[profilKisi.user_role]?.emoji || '👤'}</div><div className="flex-1 min-w-0"><p className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>{profilKisi.name}</p><p className="text-[#2ECC71] text-xs font-bold uppercase">{profilKisi.user_role}</p>{profilReviews.length > 0 && <p className="text-yellow-400 text-xs mt-1">⭐ {profilStats.avg} ({profilStats.count} {t.reviews})</p>}<p className={`text-[10px] opacity-50 mt-0.5 ${isDarkMode ? 'text-white' : 'text-black'}`}>✅ {profilStats.jobCount} {t.completedJobs}</p></div><div className="flex flex-col gap-1 flex-shrink-0"><button onClick={() => handleBlock(profilKisi.user_id)} className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">🚫 {t.blockUser}</button><button onClick={() => handleReport(profilKisi.user_id)} className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg">⚠️ {t.reportUser}</button></div></div><p className={`font-bold text-sm mb-3 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.reviews}</p>{profilReviews.length === 0 ? <p className={`text-xs opacity-40 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.noReviews}</p> : profilReviews.map(r => <div key={r.id} className={`rounded-2xl p-4 mb-3 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}><p className="text-yellow-400 text-sm mb-1">{'⭐'.repeat(r.rating)}</p>{r.comment && <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>{r.comment}</p>}<p className={`text-[10px] opacity-40 mt-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>{new Date(r.created_at).toLocaleDateString()}</p></div>)}</div></div>
        )}
        {showEmailVerifyModal && (
          <div className="fixed inset-0 z-[9500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <div className={`w-full max-w-sm rounded-3xl p-6 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
              <h3 className={`font-black text-xl text-center mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>📧 {t.verifyEmail}</h3>
              <p className={`text-center text-sm mb-4 opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.enterCodeSentTo} {user.email}</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={emailVerifyCode}
                onChange={(e) => setEmailVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t.codePlaceholder}
                className={`w-full p-4 rounded-2xl text-center text-lg font-bold tracking-[0.5em] outline-none mb-4 ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-gray-100 text-black'}`}
              />
              <div className="flex gap-3">
                <button onClick={() => setShowEmailVerifyModal(false)} className={`flex-1 py-3 rounded-2xl font-bold text-sm ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-black'}`}>{t.cancel}</button>
                <button onClick={handleVerifyEmailCode} disabled={profileEditLoading || emailVerifyCode.length !== 6} className="flex-1 py-3 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50">{profileEditLoading ? '...' : t.verify}</button>
              </div>
            </div>
          </div>
        )}
        {showChangeEmailModal && (
          <div className="fixed inset-0 z-[9500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <div className={`w-full max-w-sm rounded-3xl p-6 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
              <h3 className={`font-black text-xl text-center mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>✉️ {t.changeEmail}</h3>
              
              {emailChangeStep === 'verify-old' ? (
                <>
                  <p className={`text-center text-sm mb-4 opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.enterNewEmail}</p>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t.newEmailPlaceholder}
                    className={`w-full p-4 rounded-2xl text-sm outline-none mb-4 ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-gray-100 text-black'}`}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setShowChangeEmailModal(false)} className={`flex-1 py-3 rounded-2xl font-bold text-sm ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-black'}`}>{t.cancel}</button>
                    <button onClick={handleChangeEmail} disabled={profileEditLoading || !newEmail.trim()} className="flex-1 py-3 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50">{profileEditLoading ? '...' : t.continue}</button>
                  </div>
                </>
              ) : emailChangeStep === 'verify-old-code' ? (
                <>
                  <p className={`text-center text-sm mb-4 opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.enterCodeOldEmail} {user.email}</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={oldEmailCode}
                    onChange={(e) => setOldEmailCode(e.target.value.replace(/\D/g, ''))}
                    placeholder={t.codePlaceholder}
                    className={`w-full p-4 rounded-2xl text-center text-lg font-bold tracking-[0.5em] outline-none mb-4 ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-gray-100 text-black'}`}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setEmailChangeStep('verify-old')} className={`flex-1 py-3 rounded-2xl font-bold text-sm ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-black'}`}>← {t.back}</button>
                    <button onClick={verifyOldEmailCode} disabled={profileEditLoading || oldEmailCode.length !== 6} className="flex-1 py-3 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50">{profileEditLoading ? '...' : t.verify}</button>
                  </div>
                </>
              ) : (
                <>
                  <p className={`text-center text-sm mb-4 opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.enterCodeNewEmail} {newEmail}</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={newEmailCode}
                    onChange={(e) => setNewEmailCode(e.target.value.replace(/\D/g, ''))}
                    placeholder={t.codePlaceholder}
                    className={`w-full p-4 rounded-2xl text-center text-lg font-bold tracking-[0.5em] outline-none mb-4 ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-gray-100 text-black'}`}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setEmailChangeStep('verify-old-code')} className={`flex-1 py-3 rounded-2xl font-bold text-sm ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-black'}`}>← {t.back}</button>
                    <button onClick={verifyNewEmailAndUpdate} disabled={profileEditLoading || newEmailCode.length !== 6} className="flex-1 py-3 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50">{profileEditLoading ? '...' : t.confirm}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {showRoleModal && (
          <div className="fixed inset-0 z-[9500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <div className={`w-full max-w-sm rounded-3xl p-6 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
              <h3 className={`font-black text-xl text-center mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.selectRoles}</h3>
              <p className={`text-center text-xs mb-4 opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.workingAs}</p>
              <div className="space-y-2 mb-4">
                {[
                  { key: 'kurye', emoji: '📦', label: t.courier, color: '#fbbf24' },
                  { key: 'emanetci', emoji: '💼', label: t.emanci, color: '#3b82f6' },
                  { key: 'siraci', emoji: '⏳', label: t.waiter, color: '#22c55e' },
                  { key: 'hepsi', emoji: '🌍', label: t.all, color: '#9333ea' }
                ].map(({ key, emoji, label, color }) => {
                  const isSelected = tempSelectedRoles.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === 'hepsi') {
                          // Hepsi seçildiğinde diğerlerini temizle sadece hepsi kalsın
                          setTempSelectedRoles(['hepsi']);
                        } else {
                          // Hepsi varsa kaldır, yoksa ekle
                          setTempSelectedRoles(prev => {
                            const filtered = prev.filter(r => r !== 'hepsi');
                            if (filtered.includes(key)) {
                              return filtered.filter(r => r !== key);
                            } else {
                              return [...filtered, key];
                            }
                          });
                        }
                      }}
                      className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all border ${isSelected ? 'bg-[#2ECC71]/20 border-[#2ECC71]' : isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}
                    >
                      <span className="text-xl">{emoji}</span>
                      <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{label}</span>
                      <div className={`ml-auto w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-[#2ECC71] border-[#2ECC71]' : 'border-gray-400'}`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setTempSelectedRoles(selectedRoles);
                    setShowRoleModal(false);
                  }} 
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-black'}`}
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={async () => {
                    console.log('Kaydet butonu tıklandı');
                    if (user?.id) {
                      try {
                        let sessionUid = authSessionOk ? authUid : null;
                        if (!sessionUid) {
                          try {
                            const { data } = await supabase.auth.getSession();
                            sessionUid = data?.session?.user?.id || null;
                          } catch {
                            sessionUid = null;
                          }
                        }
                        updateDebug({ auth: { uid: sessionUid, ok: Boolean(sessionUid) } });
                        if (!sessionUid) {
                          updateDebug({
                            lastProfileUpdate: {
                              ok: false,
                              user_id: user.id,
                              error: 'No Supabase session (auth.uid() is null)',
                            },
                          });
                          showToast('Oturum yok/uyuşmuyor. Lütfen tekrar giriş yap.');
                          return;
                        }

                        const rolesToSave = tempSelectedRoles.length > 0 ? tempSelectedRoles : ['musteri'];
                        const primaryRole = rolesToSave.includes('hepsi')
                          ? 'hepsi'
                          : (rolesToSave[0] || 'musteri');
                        console.log('Kaydedilecek roller:', rolesToSave);
                        const { error } = await supabase.from('profilkisi').update({ roles: rolesToSave, role: primaryRole }).eq('user_id', user.id);
                        if (error) {
                          console.error('Supabase hatası:', error);
                          updateDebug({
                            lastProfileUpdate: {
                              ok: false,
                              user_id: user.id,
                              roles: rolesToSave,
                              role: primaryRole,
                              error: error?.message || error?.details || String(error),
                            },
                          });
                          showToast('Hata: ' + error.message);
                          return;
                        }

                        updateDebug({
                          lastProfileUpdate: {
                            ok: true,
                            user_id: user.id,
                            roles: rolesToSave,
                            role: primaryRole,
                          },
                        });
                        setSelectedRoles(rolesToSave);
                        const updatedUser = { ...user, roles: rolesToSave, role: primaryRole };
                        setUser(updatedUser);
                        localStorage.setItem('radar_user', JSON.stringify(updatedUser));
                        showToast(t.rolesSaved || 'Roller kaydedildi!');
                        setShowRoleModal(false);
                      } catch (err) {
                        console.error('Kaydet hatası:', err);
                        const msg = err?.message || String(err);
                        updateDebug({
                          lastProfileUpdate: {
                            ok: false,
                            user_id: user?.id,
                            error: msg,
                          },
                        });
                        showToast('Bir hata oluştu: ' + msg);
                      }
                    } else {
                      console.log('User yok!');
                      showToast('Kullanıcı bulunamadı');
                    }
                  }}
                  disabled={tempSelectedRoles.length === 0}
                  className="flex-1 py-3 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Profil Popup Modal */}
        {showProfileModal && profilKisi && (
          <div className="fixed inset-0 z-[9500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <div className={`w-full max-w-sm rounded-3xl p-6 max-h-[80vh] overflow-y-auto ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-500/10 flex items-center justify-center">
                  {profilKisi.avatar_url ? (
                    <img src={profilKisi.avatar_url} alt={profilKisi.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{HIZMETLER[profilKisi.user_role]?.emoji || '👤'}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`font-black text-xl ${isDarkMode ? 'text-white' : 'text-black'}`}>{profilKisi.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(profilKisi.roles || [profilKisi.user_role])
                      .filter(role => role !== 'musteri')
                      .map(role => (
                        <span key={role} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          role === 'kurye' ? 'bg-yellow-500/20 text-yellow-500' :
                          role === 'emanetci' ? 'bg-blue-500/20 text-blue-500' :
                          role === 'siraci' ? 'bg-green-500/20 text-green-500' :
                          'bg-purple-500/20 text-purple-500'
                        }`}>
                          {t[role === 'kurye' ? 'courier' : role === 'emanetci' ? 'emanci' : role === 'siraci' ? 'waiter' : role === 'hepsi' ? 'all' : 'customer']}
                        </span>
                      ))}
                  </div>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="text-2xl opacity-50">✕</button>
              </div>
              
              {/* Stats */}
              <div className={`rounded-2xl p-4 mb-4 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>{profilStats.avg}</p>
                    <p className="text-[10px] opacity-60">⭐ {t.avgRating}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-500/20"></div>
                  <div className="text-center flex-1">
                    <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>{profilStats.count}</p>
                    <p className="text-[10px] opacity-60">{t.reviews}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-500/20"></div>
                  <div className="text-center flex-1">
                    <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>{profilStats.jobCount}</p>
                    <p className="text-[10px] opacity-60">{t.completedJobs}</p>
                  </div>
                </div>
              </div>
              
              {/* Reviews */}
              <div>
                <h4 className={`font-bold text-sm mb-3 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.reviews}</h4>
                {profilReviews.length === 0 ? (
                  <p className="text-center text-sm opacity-50 py-4">{t.noReviews}</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {profilReviews.slice(0, 5).map((review, idx) => (
                      <div key={idx} className={`p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-400'}>⭐</span>
                          ))}
                          <span className="text-[10px] opacity-50 ml-2">{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{review.comment || t.noComment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* İş Talep Butonu */}
              <button 
                onClick={() => {
                  setShowProfileModal(false);
                  setSeciliKisi(profilKisi);
                }}
                className="w-full mt-4 py-4 bg-[#2ECC71] text-black rounded-2xl font-black text-sm"
              >
                {t.sendJob}
              </button>
            </div>
          </div>
        )}
        
        {/* Değerlendirme Modalı */}
        {showReviewModal && aktifIs && (
          <div className="fixed inset-0 z-[9500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <div className={`w-full max-w-sm rounded-3xl p-6 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
              <h3 className={`font-black text-xl text-center mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.rateTitle}</h3>
              <p className={`text-center text-sm mb-4 opacity-60 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                {aktifIs.sender_id === user.id ? aktifIs.receiver_name : aktifIs.sender_name}
              </p>
              
              {/* Yıldız Puanlama */}
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`text-3xl transition-transform hover:scale-125 ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-400'}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              
              {/* Yorum */}
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={t.commentPlaceholder}
                className={`w-full p-4 rounded-2xl mb-4 text-sm resize-none h-24 outline-none ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-gray-100 text-black'}`}
              />
              
              {/* Butonlar */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-black'}`}
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={async () => {
                    setReviewLoading(true);
                    try {
                      const targetId = aktifIs.sender_id === user.id ? aktifIs.receiver_id : aktifIs.sender_id;
                      await supabase.from('profilreviews').insert({
                        target_id: targetId,
                        reviewer_id: user.id,
                        request_id: aktifIs.id,
                        rating: reviewRating,
                        comment: reviewComment
                      });
                      showToast(t.reviewSent);
                      setShowReviewModal(false);
                      setReviewComment('');
                      setReviewRating(5);
                    } catch (err) {
                      showToast(t.errorOccurred);
                    } finally {
                      setReviewLoading(false);
                    }
                  }}
                  disabled={reviewLoading}
                  className="flex-1 py-3 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50"
                >
                  {reviewLoading ? '...' : t.submitReview}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && <Toast msg={toast} onClose={() => setToast(null)} dark={isDarkMode} />}
      </div>
    </main>
  );
}

export default Home;
