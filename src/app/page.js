'use client';

// ************************************************************
// SİSTEM ŞU AN GÜNCEL - BU YAZIYI GÖRÜYORSANIZ DOĞRU DOSYADIR
// ************************************************************

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

const StripePaymentModal = dynamic(() => import('./components/StripePaymentModal'), { ssr: false });

// SSR-safe dynamic imports
let Geolocation;
let libsLoaded = false;

// Lazy load libraries only on client side
const loadLibraries = async () => {
  if (libsLoaded || typeof window === 'undefined') return;
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
  if (!roles || roles.length === 0) return '#6b7280';
  if (roles.includes('hepsi')) return '#bf00ff';   // neon mor
  if (roles.includes('kurye')) return '#00ff88';   // neon yeşil
  if (roles.includes('siraci')) return '#ff6a00';  // neon turuncu
  if (roles.includes('emanetci')) return '#00cfff'; // neon mavi
  return '#6b7280';
};

const getRoleGlow = (roles) => {
  if (!roles || roles.length === 0) return 'none';
  if (roles.includes('hepsi')) return '0 0 10px #bf00ff, 0 0 20px #bf00ff88';
  if (roles.includes('kurye')) return '0 0 10px #00ff88, 0 0 20px #00ff8888';
  if (roles.includes('siraci')) return '0 0 10px #ff6a00, 0 0 20px #ff6a0088';
  if (roles.includes('emanetci')) return '0 0 10px #00cfff, 0 0 20px #00cfff88';
  return 'none';
};

const getPrimaryRole = (u) => {
  const roles = u?.roles || [u?.user_role];
  const order = ['kurye', 'emanetci', 'siraci', 'hepsi'];
  for (const r of order) if (roles?.includes(r)) return r;
  return 'musteri';
};


// Leaflet MapView - react-leaflet ile
const LeafletMapView = dynamic(() => import('./components/LeafletMapView'), { ssr: false });

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
  onMarkerSheet,
  heading,
  onResetRef,
}) {
  return (
    <LeafletMapView
      lat={lat}
      lng={lng}
      others={others}
      dark={dark}
      currentUser={currentUser}
      onSelect={onSelect}
      onProfileClick={onProfileClick}
      onMarkerSheet={onMarkerSheet}
      heading={heading}
      onResetRef={onResetRef}
      getRoleColor={getRoleColor}
      getRoleGlow={getRoleGlow}
    />
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
    notifPanelTitle: 'Bildirimler',
    notifMarkRead: 'Tümünü okundu say',
    notifEmpty: 'Henüz bildirim yok',
    notifPromptTitle: 'Bildirimleri aç',
    notifPromptBody: 'Mesajları ve iş tekliflerini kaçırmamak için.',
    notifPromptBtn: 'Aç',
    settingsAppLang: 'Uygulama Dili',
    settingsNotif: 'Anlık Bildirimler',
    settingsContracts: 'Sözleşmeler',
    settingsNotifOn: 'Açık',
    settingsNotifOff: 'Kapalı',
    settingsNotifTitle: 'Anlık Bildirimleri Al',
    settingsNotifDesc: 'İş teklifleri ve mesajlar için bildirim alın.',
    settingsNotifGranted: 'Açık',
    settingsNotifDenied: 'Reddedildi — tarayıcı ayarlarından değiştirin',
    settingsNotifDefault: 'İzin verilmedi',
    settingsNotifUnsupported: 'Bu cihazda desteklenmiyor',
    notifBrowserUnsupported: 'Tarayıcınız bildirimleri desteklemiyor',
    notifGranted: 'Bildirimler açıldı ✓',
    notifDenied: 'Bildirim izni reddedildi',
    contractUser: 'Kullanıcı Sözleşmesi',
    contractPrivacy: 'Gizlilik Politikası',
    contractCookie: 'Çerez Politikası',
    contractTerms: 'Hizmet Şartları',
    contractUserText: `1. Taraflar ve Kapsam\n\nİşbu Kullanıcı Sözleşmesi ("Sözleşme"), Platform ile Kullanıcı arasındaki karşılıklı hak ve yükümlülükleri düzenler. Platforma üye olan veya hizmetlerinden faydalanan her gerçek kişi, işbu Sözleşme'yi okumuş, anlamış ve kabul etmiş sayılır.\n\n2. Platformun Rolü ve Aracılık Hizmeti\n\nPlatform, hizmet veren (kurye, emanetçi, sıra bekleyen) ile hizmet alanı bir araya getiren teknolojik bir aracı altyapıdır. Platform, bir "Aracı Hizmet Sağlayıcı" sıfatıyla hareket eder ve taraflar arasında kurulan hukuki ilişkinin doğrudan tarafı değildir.\n\n3. Sorumluluk Sınırı\n\nPlatformun herhangi bir uyuşmazlık, kayıp veya zarar durumundaki mali sorumluluğu; yalnızca o işlemden tahsil edilen hizmet bedeli (komisyon) tutarıyla sınırlıdır. Platform, hiçbir koşulda eşya bedelini, kayıp maliyetini, gecikmeden doğan zararı ödemekle yükümlü değildir.\n\n4. Kullanıcının İbrası\n\nKullanıcı; hırsızlık, fiziksel hasar, gecikme veya üçüncü şahısların herhangi bir kusuru nedeniyle doğabilecek tüm hukuki ve cezai taleplerden Platform'u geri dönülemez biçimde ibra eder.\n\n5. Bağımsız Yüklenici Statüsü\n\nPlatform üzerinden hizmet veren tüm bireyler bağımsız birer yüklenicidir. Bu kişiler Platform'un çalışanı, temsilcisi veya alt yüklenicisi değildir.\n\n6. Delil Sözleşmesi\n\nPlatform üzerinden çekilen fotoğraflar ve konum kayıtları, 6100 sayılı HMK m.193 uyarınca kesin delil niteliğindedir.\n\n7. Yasaklı İçerik\n\nEmanet veya kurye paketinin içeriğinden tamamen Hizmet Alan sorumludur. Yasadışı içerik durumunda veriler doğrudan adli makamlarla paylaşılır.`,
    contractPrivacyText: `1. Veri Sorumlusu\n\nPlatform, 6698 sayılı KVKK kapsamında veri sorumlusu sıfatıyla hareket etmektedir.\n\n2. Toplanan Kişisel Veriler\n\nAd-soyad, e-posta, telefon numarası ve konum bilgisi toplanır. Teslim fotoğrafları şifreli olarak saklanır.\n\n3. Veri İşleme Amaçları\n\nKonum verisi yalnızca harita eşleşmesi için kullanılır. Verileriniz reklam amacıyla kullanılmaz.\n\n4. Veri Paylaşımı\n\nVeriler; Stripe ve Supabase ile yalnızca hizmet ifasına yönelik ölçüde paylaşılır. Yasal zorunluluk halinde yetkili makamlarla paylaşılabilir.\n\n5. Kullanıcı Hakları\n\nKVKK m.11 uyarınca verilerinize erişme, düzeltme veya silme hakkına sahipsiniz.`,
    contractCookieText: `1. Kullanılan Teknolojiler\n\nPlatform, çerez yerine localStorage kullanır. Yalnızca oturum, tema ve dil tercihleri için kullanılır.\n\n2. Reklam ve İzleme\n\nÜçüncü taraf reklam veya izleme aracı kullanılmamaktadır.\n\n3. Veri Kontrolü\n\nOturumu kapatarak yerel depolama verilerini temizleyebilirsiniz.`,
    contractTermsText: `1. Genel Yükümlülükler\n\nTüm kullanıcılar işbu Hizmet Şartları'na uymakla yükümlüdür.\n\n2. Emanet Hizmeti\n\nEmanet eşyanın içeriği ve yasallığı Hizmet Alan'ın sorumluluğundadır. Teslim fotoğrafları HMK m.193 uyarınca kesin delil sayılır.\n\n3. Yasaklı İçerik\n\nYasadışı içerik taşınması yasaktır. Tespit durumunda veriler adli makamlara iletilir.\n\n4. Sıra Bekleme\n\nSıra bekleyen kullanıcı belirlenen saatte hazır bulunmak zorundadır.\n\n5. Ödeme Kuralları\n\nTüm ödemeler platform altyapısı üzerinden yapılmalıdır. Platform dışı ödemeler garanti kapsamı dışındadır.\n\n6. Sorumluluk Sınırı\n\nPlatform'un azami mali sorumluluğu ilgili işlemin komisyon tutarıyla sınırlıdır.\n\n7. İptal ve İade\n\nHizmet başladıktan sonraki iptallerde kısmi kesinti uygulanabilir.`,
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
    notifPanelTitle: 'Notifications',
    notifMarkRead: 'Mark all as read',
    notifEmpty: 'No notifications yet',
    notifPromptTitle: 'Enable Notifications',
    notifPromptBody: 'Stay updated on messages and job offers.',
    notifPromptBtn: 'Enable',
    settingsAppLang: 'App Language',
    settingsNotif: 'Push Notifications',
    settingsContracts: 'Agreements',
    settingsNotifOn: 'On',
    settingsNotifOff: 'Off',
    settingsNotifTitle: 'Enable Push Notifications',
    settingsNotifDesc: 'Receive notifications for job offers and messages.',
    settingsNotifGranted: 'On',
    settingsNotifDenied: 'Denied — change in browser settings',
    settingsNotifDefault: 'Permission not granted',
    settingsNotifUnsupported: 'Not supported on this device',
    notifBrowserUnsupported: 'Your browser does not support notifications',
    notifGranted: 'Notifications enabled ✓',
    notifDenied: 'Notification permission denied',
    contractUser: 'User Agreement',
    contractPrivacy: 'Privacy Policy',
    contractCookie: 'Cookie Policy',
    contractTerms: 'Terms of Service',
    contractUserText: `1. Parties and Scope\n\nThis User Agreement ("Agreement") governs the mutual rights and obligations between the Platform and the User. Any individual who registers or uses the Platform's services is deemed to have read, understood, and accepted this Agreement.\n\n2. Platform Role\n\nThe Platform is a technological intermediary that connects service providers (couriers, custodians, queue waiters) with service recipients. The Platform acts as an "Intermediary Service Provider" and is not a direct party to the legal relationship between users.\n\n3. Limitation of Liability\n\nThe Platform's financial liability in any dispute is limited solely to the service fee (commission) collected for that transaction. The Platform is not obligated to pay for item value, loss costs, or damages arising from delays.\n\n4. User Release\n\nThe User irrevocably releases the Platform, its managers, employees, and shareholders from all legal and criminal claims arising from theft, physical damage, delay, or any fault of third parties.\n\n5. Independent Contractor Status\n\nAll individuals providing services through the Platform are independent contractors. They are not employees, representatives, or sub-contractors of the Platform.\n\n6. Evidence Agreement\n\nPhotographs and location records taken through the Platform constitute conclusive evidence under applicable civil procedure law.\n\n7. Prohibited Content\n\nThe Service Recipient is solely responsible for the contents of any package or deposit. In case of illegal content, data will be shared directly with judicial authorities.`,
    contractPrivacyText: `1. Data Controller\n\nThe Platform acts as data controller under applicable personal data protection laws.\n\n2. Collected Personal Data\n\nFull name, email, phone number, and location data are collected. Delivery photos are stored securely.\n\n3. Data Processing Purposes\n\nLocation data is used solely for map matching. Your data is never used for advertising.\n\n4. Data Sharing\n\nData is shared with Stripe and Supabase only to the extent necessary for service delivery. Sharing with authorities may occur under legal obligation.\n\n5. User Rights\n\nYou have the right to access, correct, or delete your personal data upon request.`,
    contractCookieText: `1. Storage Technologies\n\nThe Platform uses localStorage instead of cookies, limited to session management, theme, and language preferences.\n\n2. Advertising and Tracking\n\nNo third-party advertising or behavioral tracking tools are used.\n\n3. Data Control\n\nYou can clear local storage data by logging out of the application.`,
    contractTermsText: `1. General Obligations\n\nAll users are obligated to comply with these Terms of Service.\n\n2. Custodian Service\n\nThe Service Recipient is responsible for the contents and legality of deposited items. Delivery photos constitute conclusive evidence under applicable law.\n\n3. Prohibited Content\n\nTransporting illegal content is strictly prohibited. Data will be forwarded to judicial authorities upon detection.\n\n4. Queue Waiting Service\n\nThe queue waiter must be present at the specified time and location.\n\n5. Payment Rules\n\nAll payments must be made through the Platform's infrastructure. Payments made outside the Platform are not covered.\n\n6. Limitation of Liability\n\nThe Platform's maximum financial liability is limited to the commission amount of the relevant transaction.\n\n7. Cancellation and Refund\n\nPartial deductions may apply for cancellations after service has commenced.`,
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
  // Fotoğraf etiket modal
  const [photoLabelModal, setPhotoLabelModal] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [photoLabel, setPhotoLabel] = useState(null); // 'teslim_aldim' | 'teslim_ettim' | null

  // Bildirimler
  const [notifications, setNotifications] = useState([]);
  const [notifPanelAcik, setNotifPanelAcik] = useState(false);

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
  const [providerBalance, setProviderBalance] = useState({ available: 0, pending: 0, total: 0 });
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [langMenuAcik, setLangMenuAcik] = useState(false);
  const [settingsSubPage, setSettingsSubPage] = useState(null); // null | 'contracts' | 'contract-detail' | 'language' | 'notifications'
  const [activeContract, setActiveContract] = useState(null); // { title, text }
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [markerSheet, setMarkerSheet] = useState(null); // { user, stats }
  const [markerSheetLoading, setMarkerSheetLoading] = useState(false);

  const [currentStage, setCurrentStage] = useState('accepted');
  const [photoProofRequired, setPhotoProofRequired] = useState(false);
  const [myBlocks, setMyBlocks] = useState(new Set());
  const [blockedByOthers, setBlockedByOthers] = useState(new Set());
  const myBlocksRef = useRef(new Set());
  const blockedByOthersRef = useRef(new Set());

  // Hydration kontrolü - client mount sonrası aktif olsun
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => { setIsHydrated(true); }, []);

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

  useEffect(() => {
    if (!stripeConnected || !user?.id) return;
    (async () => {
      setBalanceLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/stripe/balance', {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        const data = await res.json();
        if (data && !data.error) setProviderBalance(data);
      } catch {}
      finally { setBalanceLoading(false); }
    })();
  }, [stripeConnected, user?.id]);

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

        // Stripe provider durumunu set et
        const hasStripe = Boolean(profile.stripe_account_id);
        setStripeConnected(hasStripe);
        setIsProvider(Boolean(profile.is_provider));

        // Tüm profil verilerini localStorage'a kaydet
        try {
          localStorage.setItem('radar_user', JSON.stringify(userData));
        } catch (e) {
          console.error('Error saving user to localStorage:', e);
        }
      } else {
        // Profil DB'den gelmedi - localStorage'daki kaydı koru (geçici hata olabilir)
        try {
          const saved = localStorage.getItem('radar_user');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.id === session?.user?.id) {
              setUser(parsed);
            } else {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        } catch { setUser(null); }
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

      // Konum izleme - watchPosition ile anlık ve yüksek hassasiyetli
      if (Geolocation) {
        // Capacitor: interval ile devam
        const locationInterval = window.setInterval(async () => {
          try {
            const position = await getCurrentPositionWithFallback({ enableHighAccuracy: true, timeout: 10000 });
            const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
            const now = Date.now();
            if (sonKonumRef.current) {
              const mesafe = getDistance(sonKonumRef.current.lat, sonKonumRef.current.lng, coords.lat, coords.lng);
              if (mesafe < 5 && now - lastLocationUpsertAtRef.current < 25_000) { sonKonumRef.current = coords; setKonum(coords); return; }
            }
            sonKonumRef.current = coords;
            setKonum(coords);
            await upsertLastSeen(coords);
          } catch (e) {}
        }, 5000);
        watchId = locationInterval;
      } else if (navigator.geolocation) {
        // Browser: watchPosition ile anlık GPS
        const wid = navigator.geolocation.watchPosition(
          async (position) => {
            const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
            const now = Date.now();
            if (sonKonumRef.current) {
              const mesafe = getDistance(sonKonumRef.current.lat, sonKonumRef.current.lng, coords.lat, coords.lng);
              if (mesafe < 5 && now - lastLocationUpsertAtRef.current < 25_000) { sonKonumRef.current = coords; setKonum(coords); return; }
            }
            sonKonumRef.current = coords;
            setKonum(coords);
            await upsertLastSeen(coords);
          },
          (err) => console.log('watchPosition error:', err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
        watchId = wid;
      }

      // Heartbeat: kullanıcı hareket etmese bile görünür kalması için
      heartbeatTimer = window.setInterval(() => {
        const coords = sonKonumRef.current;
        if (coords) upsertLastSeen(coords);
      }, 45_000);
    };
    initGeolocation();

    return () => {
      if (watchId !== null) {
        if (Geolocation) window.clearInterval(watchId);
        else navigator.geolocation?.clearWatch(watchId);
      }
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

  // ─── BİLDİRİMLER ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const loadNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications(data || []);
    };
    loadNotifs();
    const ch = supabase.channel(`notif-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

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
    // Etiket seçimi için modal aç
    setPendingPhotoFile(file);
    setPhotoLabel(null);
    setPhotoLabelModal(true);
    e.target.value = '';
  };

  const handleFotoGonderWithLabel = async (label) => {
    const file = pendingPhotoFile;
    if (!file || !aktifIs || !user) return;
    setPhotoLabelModal(false);
    const bucket = photoProofRequired ? PROOF_BUCKET : CHAT_BUCKET;
    const fileName = `${aktifIs.id}/${Date.now()}_${file.name}`;
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
    // GPS + saat metadata
    const now = new Date().toISOString();
    const gpsLat = konum?.lat || null;
    const gpsLng = konum?.lng || null;
    await supabase.from('messages').insert([{
      request_id: aktifIs.id,
      sender_id: user.id,
      content: urlData.publicUrl,
      type: 'image',
      metadata: { label, gps_lat: gpsLat, gps_lng: gpsLng, sent_at: now }
    }]);
    if (photoProofRequired) handleAdvanceStage(currentStage === 'arrived' ? 'picked_up' : 'delivered');
    setPhotoProofRequired(false);
    setPendingPhotoFile(null);
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

  const updateProfileAfterReview = async (targetId, rating) => {
    // Mevcut reviews ortalamasını hesapla
    const { data: reviews } = await supabase.from('profilreviews').select('rating').eq('target_id', targetId);
    const allRatings = [...(reviews || []).map(r => r.rating), rating];
    const avg = allRatings.reduce((s, r) => s + r, 0) / allRatings.length;
    // profiles tablosunu güncelle
    const tidStr = String(targetId);
    // average_rating güncelle
    await supabase.from('profilkisi').update({
      average_rating: parseFloat(avg.toFixed(2)),
    }).eq('user_id', tidStr);
    // total_completed_jobs için RPC dene, yoksa direkt update
    await supabase.rpc('increment_completed_jobs', { user_id: targetId }).catch(async () => {
      const { data: pd } = await supabase.from('profilkisi').select('total_completed_jobs').eq('user_id', tidStr).single();
      await supabase.from('profilkisi').update({ total_completed_jobs: (pd?.total_completed_jobs || 0) + 1 }).eq('user_id', tidStr);
    });
  };

  const handleReviewGonder = async () => {
    if (!reviewHedef || !user) return;
    await supabase.from('profilreviews').insert([{ target_id: reviewHedef, reviewer_id: user.id, rating: reviewPuan, comment: reviewYorum }]);
    await updateProfileAfterReview(reviewHedef, reviewPuan);
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

  const handleLogout = async () => { await supabase.auth.signOut(); try { localStorage.removeItem('radar_user'); } catch {} setUser(null); setAktifIs(null); setGelenTalep(null); setMesajlar([]); setChatAcik(false); setUnreadCount(0); setCallState('idle'); };

  const filteredDigerleri = (() => {
    const result = digerleri.filter(u => {
      // Kendini gösterme
      if (user && u.user_id === user.id) return false;
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
  if (!isHydrated || (!authInitialized && !user)) {
    return (
      <main className="fixed inset-0 bg-[#0F0F0F] flex items-center justify-center" suppressHydrationWarning>
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-5xl font-black italic tracking-tighter text-[#2ECC71] transform -skew-x-12 animate-pulse">TICK</h1>
          <div className="w-8 h-1 bg-[#2ECC71]/30 rounded-full overflow-hidden">
            <div className="h-full bg-[#2ECC71] rounded-full animate-[slide_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main 
      className={`w-screen overflow-hidden ${isDarkMode ? 'bg-[#0F0F0F] text-white' : 'bg-white text-black'} h-[100dvh]`}
      suppressHydrationWarning
    >
      {isHydrated && <audio id="radar-remote-audio" autoPlay playsInline style={{ display: 'none' }} />}
      <div className="relative w-full h-[100dvh]" suppressHydrationWarning>
        {showNotifPrompt && (
          <div className="fixed left-1/2 -translate-x-1/2 top-6 z-[4000] w-[92%] max-w-md">
            <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className={`font-black text-xs uppercase`}>{t.notifPromptTitle}</p>
                <p className="text-white/60 text-[11px] font-bold truncate">{t.notifPromptBody}</p>
              </div>
              <button onClick={requestNotifications} className="px-4 py-2 rounded-xl bg-[#2ECC71] text-black text-[11px] font-black uppercase">
                {t.notifPromptBtn}
              </button>
              <button onClick={() => setShowNotifPrompt(false)} className="px-3 py-2 rounded-xl bg-white/10 text-white/70 text-[11px] font-black">
                ✕
              </button>
            </div>
          </div>
        )}
          <button 
          onClick={() => setAktifPage('menu')} 
          suppressHydrationWarning
          className={`fixed z-[3000] p-4 rounded-2xl backdrop-blur-xl shadow-[0_0_30px_rgba(255,255,255,0.06)] transition-transform hover:scale-105 ${isDarkMode ? 'bg-black/40 border border-white/10' : 'bg-white/75 border border-black/10'}`}
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: '16px' }}
        >
          <div className={`w-6 h-0.5 mb-1.5 ${isDarkMode ? 'bg-white' : 'bg-black'}`}></div><div className={`w-6 h-0.5 mb-1.5 ${isDarkMode ? 'bg-white' : 'bg-black'}`}></div><div className={`w-4 h-0.5 ${isDarkMode ? 'bg-white' : 'bg-black'}`}></div>
        </button>
        {aktifIs && !chatAcik && (
          <button 
            onClick={() => setChatAcik(true)} 
            className="fixed right-6 z-[3000] px-5 py-3 rounded-2xl bg-[#2ECC71] text-white text-xs font-black uppercase flex items-center gap-2 shadow-lg"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
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
            onMarkerSheet={async (u) => {
              setMarkerSheet({ user: u, stats: null });
              setMarkerSheetLoading(true);
              try {
                const [reviewsRes, requestsRes] = await Promise.all([
                  supabase.from('reviews').select('rating, comment, created_at').eq('reviewee_id', u.user_id).order('created_at', { ascending: false }).limit(5),
                  supabase.from('requests').select('id').eq('receiver_id', u.user_id).eq('status', 'completed'),
                ]);
                const reviews = reviewsRes.data || [];
                const completedCount = requestsRes.data?.length || 0;
                const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
                setMarkerSheet({ user: u, stats: { reviews, completedCount, avgRating } });
              } catch {}
              finally { setMarkerSheetLoading(false); }
            }}
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
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-[#2ECC71]/20 rounded-full flex items-center justify-center text-xl font-bold text-[#2ECC71] shadow-[0_0_25px_rgba(46,204,113,0.18)] cursor-pointer flex-shrink-0" onClick={() => setAktifPage('account')}>{user.name[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setAktifPage('account')}>
                <p className={`font-bold text-lg truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.name}</p>
                <p className="text-[#2ECC71] text-[10px] font-black uppercase">{t.myAccount}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setNotifPanelAcik(v => !v); }} className="relative flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-black'}`}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                    {notifications.filter(n => !n.is_read).length > 9 ? '9+' : notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>
            </div>
            <div className="flex-1 space-y-1">
              {['support', 'payment', 'history'].map(p => <button key={p} onClick={() => setAktifPage(p)} className={`w-full text-left py-3 px-2 font-semibold text-sm border-b transition-all hover:scale-[1.01] hover:bg-white/5 hover:shadow-[0_0_20px_rgba(255,255,255,0.06)] ${isDarkMode ? 'text-white border-white/10' : 'text-black border-black/10'}`}>{t[p]}</button>)}
              {user?.is_admin && (
                <a href="/admin" target="_blank" rel="noopener noreferrer" className={`w-full text-left py-3 px-2 font-semibold text-sm border-b transition-all hover:scale-[1.01] hover:bg-red-500/10 flex items-center gap-2 ${isDarkMode ? 'text-red-400 border-white/10' : 'text-red-600 border-black/10'}`}>🛡 Admin Paneli <span className="text-[10px] opacity-50">↗</span></a>
              )}
            </div>
            <div className="mt-6 space-y-3">
              <button onClick={() => setAktifPage('settings')} className={`w-full p-4 rounded-2xl font-bold text-sm text-left flex items-center gap-2 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-black/5 text-black'}`}>⚙️ {t.settings || 'Ayarlar'}</button>
              <button onClick={handleLogout} className="w-full p-4 bg-red-500/10 text-red-500 rounded-2xl font-bold text-sm">{t.logout}</button>
            </div>
          </div>
        </div>
        {/* ── BİLDİRİM PANELİ ── */}
      {notifPanelAcik && aktifPage === 'menu' && (
        <div className="fixed inset-0 z-[5500] animate-fade-in" onClick={() => setNotifPanelAcik(false)}>
          <div className={`absolute left-5 w-[72%] max-w-[280px] rounded-3xl border shadow-2xl overflow-hidden animate-fade-slide-up ${isDarkMode ? 'bg-[#111] border-white/10' : 'bg-white border-black/10'}`}
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 60px)', maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 80px)' }}
            onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
              <p className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.notifPanelTitle}</p>
              {notifications.some(n => !n.is_read) && (
                <button onClick={async () => {
                  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
                  setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                }} className="text-[10px] text-emerald-400 font-black">{t.notifMarkRead}</button>
              )}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 48px)' }}>
              {notifications.length === 0 ? (
                <p className={`text-center text-xs py-8 ${isDarkMode ? 'text-white/30' : 'text-black/30'}`}>{t.notifEmpty}</p>
              ) : notifications.map(n => (
                <div key={n.id} onClick={async () => {
                  if (!n.is_read) {
                    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
                    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                  }
                  if (n.link) { setNotifPanelAcik(false); }
                }} className={`px-4 py-3 border-b cursor-pointer transition-colors ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'} ${!n.is_read ? isDarkMode ? 'bg-white/[0.03]' : 'bg-emerald-50' : ''}`}>
                  <div className="flex items-start gap-2">
                    {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />}
                    {n.is_read && <div className="w-1.5 h-1.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-black'}`}>{n.title}</p>
                      <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>{n.body}</p>
                      <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-white/25' : 'text-black/25'}`}>{new Date(n.created_at).toLocaleString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {aktifPage === 'settings' && (() => {
        const contracts = [
          { key: 'user', title: t.contractUser, text: t.contractUserText },
          { key: 'privacy', title: t.contractPrivacy, text: t.contractPrivacyText },
          { key: 'cookie', title: t.contractCookie, text: t.contractCookieText },
          { key: 'terms', title: t.contractTerms, text: t.contractTermsText },
        ];

        const bg = isDarkMode ? 'bg-[#0F0F0F]' : 'bg-[#F2F2F7]';
        const listBg = isDarkMode ? 'bg-[#1C1C1E]' : 'bg-white';
        const textPrimary = isDarkMode ? 'text-white' : 'text-black';
        const textSub = isDarkMode ? 'text-white/40' : 'text-black/40';
        const divider = isDarkMode ? 'border-white/8' : 'border-black/8';
        const chevron = (
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M1 1l5 5-5 5" stroke={isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

        const ListRow = ({ label, sub, onClick }) => (
          <button onClick={onClick} className={`w-full flex items-center px-4 py-3.5 gap-3 mx-4 rounded-2xl active:opacity-60 transition-opacity ${listBg}`} style={{width: 'calc(100% - 2rem)'}}>
            <div className="flex-1 text-left">
              <p className={`text-sm ${textPrimary}`}>{label}</p>
              {sub && <p className={`text-[11px] mt-0.5 ${textSub}`}>{sub}</p>}
            </div>
            {chevron}
          </button>
        );

        const PageHeader = ({ title, onBack }) => (
          <div className={`flex items-center pt-14 pb-3 px-4 border-b ${divider}`}>
            <button onClick={onBack} className={`flex items-center gap-1 text-sm font-medium ${isDarkMode ? 'text-white/60' : 'text-black/60'} mr-3`}>
              <svg width="8" height="13" viewBox="0 0 8 13" fill="none"><path d="M7 1L2 6.5 7 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2 className={`font-semibold text-base ${textPrimary}`}>{title}</h2>
          </div>
        );

        // Sayfa 3: Sözleşme Detayı
        if (settingsSubPage === 'contract-detail' && activeContract) return (
          <div className={`fixed inset-0 z-[6200] flex flex-col ${bg}`}>
            <PageHeader title={activeContract.title} onBack={() => setSettingsSubPage('contracts')} />
            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12">
              <p className={`text-[13px] leading-relaxed whitespace-pre-line ${textPrimary} opacity-75`}>{activeContract.text}</p>
            </div>
          </div>
        );

        // Sayfa 2: Sözleşmeler Listesi
        if (settingsSubPage === 'contracts') return (
          <div className={`fixed inset-0 z-[6100] flex flex-col ${bg}`}>
            <PageHeader title={t.settingsContracts} onBack={() => setSettingsSubPage(null)} />
            <div className="flex-1 overflow-y-auto pt-4 pb-10 space-y-2">
              {contracts.map((c) => (
                <ListRow key={c.key} label={c.title}
                  onClick={() => { setActiveContract(c); setSettingsSubPage('contract-detail'); }} />
              ))}
            </div>
          </div>
        );

        // Sayfa 2: Dil Seçimi
        if (settingsSubPage === 'language') return (
          <div className={`fixed inset-0 z-[6100] flex flex-col ${bg}`}>
            <PageHeader title={t.settingsAppLang} onBack={() => setSettingsSubPage(null)} />
            <div className="flex-1 overflow-y-auto pt-4 pb-10 space-y-2">
              {Object.entries(TRANSLATIONS).map(([code, tl]) => (
                <button key={code} onClick={() => { handleLangChange(code); setSettingsSubPage(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 mx-4 rounded-2xl active:opacity-60 transition-opacity ${lang === code ? 'border border-[#2ECC71]/30' : ''} ${listBg}`} style={{width: 'calc(100% - 2rem)'}}>
                  <span className="text-base">{tl.flag}</span>
                  <span className={`flex-1 text-left text-sm ${lang === code ? 'text-[#2ECC71] font-semibold' : textPrimary}`}>{tl.name}</span>
                  {lang === code && <span className="text-[#2ECC71] text-sm font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>
        );

        // Sayfa 2: Anlık Bildirimler
        if (settingsSubPage === 'notifications') return (
          <div className={`fixed inset-0 z-[6100] flex flex-col ${bg}`}>
            <PageHeader title={t.settingsNotif} onBack={() => setSettingsSubPage(null)} />
            <div className="flex-1 pt-6 px-4 pb-10 space-y-3">
              <p className={`text-xs px-1 mb-1 ${textSub}`}>{t.settingsNotifDesc}</p>
              <div className={`rounded-2xl ${listBg} overflow-hidden`}>
                <div className={`flex items-center px-4 py-3.5 gap-3`}>
                  <div className="flex-1">
                    <p className={`text-sm ${textPrimary}`}>{t.settingsNotifTitle}</p>
                    <p className={`text-[11px] mt-0.5 ${textSub}`}>
                      {typeof window !== 'undefined' && 'Notification' in window
                        ? Notification.permission === 'granted' ? t.settingsNotifGranted : Notification.permission === 'denied' ? t.settingsNotifDenied : t.settingsNotifDefault
                        : t.settingsNotifUnsupported}
                    </p>
                  </div>
                  <button onClick={async () => {
                    if (!('Notification' in window)) return showToast(t.notifBrowserUnsupported);
                    const perm = await Notification.requestPermission();
                    if (perm === 'granted') showToast(t.notifGranted);
                    else showToast(t.notifDenied);
                    setSettingsSubPage('notifications');
                  }} className={`w-11 h-6 rounded-full flex-shrink-0 transition-colors relative ${typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? 'bg-[#2ECC71]' : isDarkMode ? 'bg-white/20' : 'bg-black/15'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? 'right-0.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

        // Sayfa 1: Ana Ayarlar
        const notifStatus = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? t.settingsNotifOn : t.settingsNotifOff;
        return (
          <div className={`fixed inset-0 z-[6000] flex flex-col ${bg}`}>
            <PageHeader title={t.settings} onBack={() => { setAktifPage('menu'); setSettingsSubPage(null); }} />
            <div className="flex-1 overflow-y-auto pt-4 pb-10 space-y-2">
              <ListRow label={t.settingsAppLang} sub={`${TRANSLATIONS[lang]?.flag} ${TRANSLATIONS[lang]?.name}`} onClick={() => setSettingsSubPage('language')} />
              <ListRow label={t.settingsNotif} sub={notifStatus} onClick={() => setSettingsSubPage('notifications')} />
              <ListRow label={t.settingsContracts} onClick={() => setSettingsSubPage('contracts')} />
            </div>
          </div>
        );
      })()}
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
                <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>{walletBalance}</p>
              </div>

              {/* Para Yatırma */}
              <div className={`rounded-3xl p-6 mb-6 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-black/10'}`}>
                <h3 className={`font-bold text-sm uppercase mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Para Yatır</h3>
                
                {/* Komisyon bilgisi */}
                <div className={`mb-4 p-3 rounded-lg text-xs ${isDarkMode ? 'bg-white/5 text-white/70' : 'bg-zinc-200 text-black/70'}`}>
                  <p>İşlem ücreti: min 25 veya %5 (üstüne eklenir)</p>
                  {paymentAmount > 0 && (() => {
                    const amt = parseFloat(paymentAmount) || 0;
                    const commission = Math.max(25, amt * 0.05);
                    const total = amt + commission;
                    return (
                      <div className="mt-2 space-y-1">
                        <p>İşlem ücreti: <span className="text-yellow-400">{commission.toFixed(2)}</span></p>
                        <p>Toplam ödenecek: <span className="text-white font-bold">{total.toFixed(2)}</span></p>
                        <p>Cüzdanınıza gelecek: <span className="text-[#2ECC71] font-bold">{amt.toFixed(2)}</span></p>
                      </div>
                    );
                  })()}
                </div>

                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Miktar"
                  className={`w-full p-4 rounded-xl text-lg mb-4 outline-none border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500 border-white/10' : 'bg-zinc-200 text-black border-black/20'}`}
                />
                <button
                  onClick={() => {
                    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
                    setClientSecret('show');
                  }}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="w-full py-4 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                >
                  Kart ile Öde
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
                    {paymentAmount > 0 && (() => {
                      const amt = parseFloat(paymentAmount) || 0;
                      const commission = Math.max(25, amt * 0.05);
                      const total = amt + commission;
                      return (
                        <div className={`text-xs space-y-1 ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>
                          <p>İşlem ücreti: <span className="text-yellow-400">{commission.toFixed(2)}</span></p>
                          <p>Toplam ödenecek: <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{total.toFixed(2)}</span></p>
                          <p>Cüzdanınıza gelecek: <span className="text-[#2ECC71] font-bold">{amt.toFixed(2)}</span></p>
                        </div>
                      );
                    })()}
                    <button
                      onClick={async () => {
                        const amt = parseFloat(paymentAmount) || 0;
                        const commission = Math.max(25, amt * 0.05);
                        const net = amt;
                        
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
                      className="w-full py-3 bg-[#2ECC71] text-black rounded-xl font-bold text-sm active:scale-95 transition-transform"
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
                  <p>Transfer ücreti: min 20 veya %4 (üstüne eklenir)</p>
                  {transferAmount > 0 && (() => {
                    const amt = parseFloat(transferAmount) || 0;
                    const commission = Math.max(20, amt * 0.04);
                    const total = amt + commission;
                    return (
                      <div className="mt-2 space-y-1">
                        <p>Transfer ücreti: <span className="text-yellow-400">{commission.toFixed(2)}</span></p>
                        <p>Toplam ödenecek: <span className="text-white font-bold">{total.toFixed(2)}</span></p>
                        <p>Alıcıya gelecek: <span className="text-[#2ECC71] font-bold">{amt.toFixed(2)}</span></p>
                      </div>
                    );
                  })()}
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
                    const commission = Math.max(20, amt * 0.04);
                    const totalNeeded = amt + commission;
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
                  className="w-full py-4 bg-[#2ECC71] text-black rounded-2xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-[#2ECC71] rounded-full animate-pulse"></div>
                        <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Stripe Bağlı ✓</p>
                      </div>
                      <button
                        onClick={async () => {
                          setBalanceLoading(true);
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const res = await fetch('/api/stripe/balance', {
                              headers: { Authorization: `Bearer ${session?.access_token}` }
                            });
                            const data = await res.json();
                            if (data && !data.error) setProviderBalance(data);
                          } catch (e) {
                            showToast('Bakiye yüklenemedi');
                          } finally {
                            setBalanceLoading(false);
                          }
                        }}
                        className="text-xs text-[#635BFF] font-bold"
                      >
                        {balanceLoading ? '⏳' : '↻ Yenile'}
                      </button>
                    </div>
                    <p className={`text-xs opacity-50 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      %10 platform komisyonu uygulanır
                    </p>
                  </div>

                  {/* Bakiye Kartları */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className={`rounded-2xl p-5 border ${isDarkMode ? 'bg-[#2ECC71]/10 border-[#2ECC71]/20' : 'bg-[#2ECC71]/10 border-[#2ECC71]/30'}`}>
                      <p className="text-xs font-bold text-[#2ECC71] uppercase mb-1">Kullanılabilir Bakiye</p>
                      <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        {balanceLoading ? '...' : `₺${providerBalance.available.toFixed(2)}`}
                      </p>
                      <p className="text-[10px] opacity-50 mt-1">Stripe hesabında çekilebilir</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-black/10'}`}>
                        <p className="text-[10px] font-bold opacity-60 uppercase mb-1">Bekleyen</p>
                        <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>
                          {balanceLoading ? '...' : `₺${providerBalance.pending.toFixed(2)}`}
                        </p>
                        <p className="text-[9px] opacity-40 mt-1">Onay bekliyor</p>
                      </div>
                      <div className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-black/10'}`}>
                        <p className="text-[10px] font-bold opacity-60 uppercase mb-1">Toplam Kazanç</p>
                        <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>
                          {balanceLoading ? '...' : `₺${providerBalance.total.toFixed(2)}`}
                        </p>
                        <p className="text-[9px] opacity-40 mt-1">Tüm zamanlar</p>
                      </div>
                    </div>
                  </div>

                  {/* Komisyon Bilgisi */}
                  <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>Nasıl Çalışır?</p>
                    <div className="space-y-1.5 text-[11px] opacity-60">
                      <p>1️⃣ Müşteri işi başlattığında para Stripe'ta dondurulur</p>
                      <p>2️⃣ İşi tamamla, kanıt fotoğrafı yükle</p>
                      <p>3️⃣ Müşteri onayladığında %90'ı hesabına geçer</p>
                      <p>4️⃣ %10 platform komisyonu kesilir</p>
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
        {/* Marker Bottom Sheet */}
        {markerSheet && (
          <div
            className="fixed inset-0 z-[8500]"
            onClick={() => setMarkerSheet(null)}
          >
            <div
              className={`absolute bottom-0 left-0 right-0 rounded-t-[32px] p-6 pb-10 shadow-2xl transition-transform duration-300 ease-out ${isDarkMode ? 'bg-[#141414] border-t border-white/10' : 'bg-white border-t border-black/10'}`}
              style={{ transform: markerSheet ? 'translateY(0)' : 'translateY(100%)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center mb-4">
                <div className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-black/20'}`} />
              </div>

              {(() => {
                const u = markerSheet.user;
                const stats = markerSheet.stats;
                const uRoles = u.roles || [u.user_role];
                const color = getRoleColor(uRoles);
                const glow = getRoleGlow(uRoles);
                const roleLabels = { kurye: 'Kurye', emanetci: 'Emanetçi', siraci: 'Sıra Bekle', hepsi: 'Hepsi', musteri: 'Müşteri' };
                const primaryRole = getPrimaryRole(u);

                return (
                  <div className="space-y-4">
                    {/* Kullanıcı bilgisi */}
                    <div className="flex items-center gap-4">
                      <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: color + '22', border: `2px solid ${color}`, boxShadow: glow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 22 }}>{u.name?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <div className="flex-1">
                        <p className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>{u.name || '?'}</p>
                        <span style={{ backgroundColor: color + '22', color, border: `1px solid ${color}55`, boxShadow: glow }} className="text-[11px] font-bold px-2 py-0.5 rounded-full">
                          {roleLabels[primaryRole] || primaryRole}
                        </span>
                      </div>
                      {markerSheetLoading && <div className="text-[#2ECC71] text-xs animate-pulse">Yükleniyor...</div>}
                    </div>

                    {/* İstatistikler */}
                    {stats && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`rounded-2xl p-3 text-center ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                          <p className="text-xl font-black" style={{ color }}>
                            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
                          </p>
                          <p className={`text-[10px] opacity-50 ${isDarkMode ? 'text-white' : 'text-black'}`}>⭐ Ortalama</p>
                        </div>
                        <div className={`rounded-2xl p-3 text-center ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                          <p className="text-xl font-black" style={{ color }}>{stats.reviews.length}</p>
                          <p className={`text-[10px] opacity-50 ${isDarkMode ? 'text-white' : 'text-black'}`}>💬 Yorum</p>
                        </div>
                        <div className={`rounded-2xl p-3 text-center ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                          <p className="text-xl font-black" style={{ color }}>{stats.completedCount}</p>
                          <p className={`text-[10px] opacity-50 ${isDarkMode ? 'text-white' : 'text-black'}`}>✅ Tamamlanan</p>
                        </div>
                      </div>
                    )}

                    {/* Yorumlar */}
                    {stats?.reviews?.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {stats.reviews.map((r, i) => (
                          <div key={i} className={`rounded-xl p-3 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <div className="flex items-center gap-1 mb-1">
                              {[1,2,3,4,5].map(s => (
                                <span key={s} className={`text-[10px] ${s <= r.rating ? 'text-yellow-400' : 'opacity-20'}`}>★</span>
                              ))}
                              <span className={`text-[9px] opacity-40 ml-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>{new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            {r.comment && <p className={`text-xs opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`}>{r.comment}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {stats && stats.reviews.length === 0 && (
                      <p className={`text-xs opacity-40 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Henüz yorum yok</p>
                    )}

                    {/* Butonlar */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={() => { setMarkerSheet(null); setSeciliKisi(u); }}
                        className="py-3 rounded-2xl font-black text-sm text-black active:scale-95 transition-transform"
                        style={{ backgroundColor: color, boxShadow: glow }}
                      >
                        Teklif Ver
                      </button>
                      <button
                        onClick={async () => { setMarkerSheet(null); await handleProfilAc(u); setShowProfileModal(true); }}
                        className={`py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform border ${isDarkMode ? 'bg-white/5 text-white border-white/10' : 'bg-gray-100 text-black border-black/10'}`}
                      >
                        Profili Gör
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {showPaymentModal && aktifIs?.price && (
          <StripePaymentModal
            amount={parseFloat(aktifIs.price)}
            requestId={aktifIs.id}
            isDarkMode={isDarkMode}
            supabase={supabase}
            walletBalance={walletBalance}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={() => {
              setShowPaymentModal(false);
              setPaymentDone(true);
              setAktifIs(prev => prev ? { ...prev, payment_status: 'held' } : prev);
              showToast('✅ Ödeme güvenceye alındı!');
            }}
          />
        )}
        <button
          onClick={konumaGit}
          className={`fixed z-[3100] w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform ${isDarkMode ? 'bg-white/10 border border-white/10 backdrop-blur-md' : 'bg-white border border-black/10 shadow'}`}
          style={{ bottom: '260px', right: '16px' }}
          title="Konumuma Git"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          </svg>
        </button>
        <div className={`fixed bottom-0 left-0 right-0 rounded-t-[40px] z-[3000] transition-transform duration-500 ${isDarkMode ? 'bg-[#121212]' : 'bg-slate-200/90 backdrop-blur-xl border border-black/10 shadow-2xl'}`} style={{ transform: (sheetYukseklik === 1 && !seciliKisi) ? 'translateY(80%)' : 'translateY(0)' }}>
          <div className="w-full py-4 flex items-center justify-center relative cursor-pointer" onClick={() => setSheetYukseklik(sheetYukseklik === 0 ? 1 : 0)}>
            <div className={`w-12 h-1.5 rounded-full ${isDarkMode ? 'bg-gray-500/30' : 'bg-black/15'}`}></div>
          </div>
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
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'kurye', emoji: '🚗', label: t.fastCourier, desc: t.courierDesc },
                    { key: 'emanetci', emoji: '💼', label: t.custodian, desc: t.custodianDesc },
                    { key: 'siraci', emoji: '⏱', label: t.waitInLine, desc: t.waitDesc },
                    { key: 'hepsi', emoji: '🌍', label: t.all, desc: t.allDesc }
                  ].map(({ key, emoji, label, desc }) => (
                    <div
                      key={key}
                      onClick={() => setAktifFiltre(key)}
                      className={`px-4 py-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer border ${
                        aktifFiltre === key
                          ? `border-[#2ECC71] ${isDarkMode ? 'bg-[#2ECC71]/10' : 'bg-[#2ECC71]/10'}`
                          : `border-transparent ${isDarkMode ? 'bg-white/5' : 'bg-white border-black/8'}`
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{emoji}</span>
                      <div className="min-w-0">
                        <p className={`font-black text-[11px] uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>{label}</p>
                        <p className={`text-[9px] font-medium mt-0.5 leading-tight truncate ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className={`mt-4 text-center text-[10px] font-bold opacity-20 uppercase italic tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.tagline}</p>
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

            {/* Ödeme Butonu - Sadece müşteri (sender) + fiyat var + ödeme yapılmamış */}
            {isSender && aktifIs?.price && !paymentDone && aktifIs?.payment_status !== 'held' && aktifIs?.payment_status !== 'released' && (
              <div className="mx-4 my-2">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-3 bg-[#635BFF] text-white rounded-2xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-[#635BFF]/20"
                >
                  💳 Ödemeyi Güvenceye Al · {aktifIs.price}
                </button>
                <p className="text-[10px] text-center opacity-40 mt-1">
                  Para iş onaylanana kadar güvende tutulur
                </p>
              </div>
            )}
            {(paymentDone || aktifIs?.payment_status === 'held') && (
              <div className="mx-4 my-2 py-2 px-4 rounded-2xl bg-[#2ECC71]/10 border border-[#2ECC71]/30 text-center">
                <p className="text-[#2ECC71] text-[11px] font-bold">✓ Ödeme güvencede — iş onaylandığında hizmet verene aktarılır</p>
              </div>
            )}

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
                     {m.type === 'image' ? (
                       <div>
                         <img src={m.content} alt="img" className="max-w-full" style={{ maxHeight: 200 }} />
                         {m.metadata && (
                           <div className="px-3 py-2 border-t border-white/10 space-y-0.5">
                             {m.metadata.label && (
                               <p className="text-[10px] font-black uppercase tracking-wide">
                                 {m.metadata.label === 'teslim_aldim' ? '📥 Teslim Aldım' : m.metadata.label === 'teslim_ettim' ? '📤 Teslim Ettim' : ''}
                               </p>
                             )}
                             {m.metadata.sent_at && (
                               <p className="text-[9px] opacity-50">{new Date(m.metadata.sent_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                             )}
                             {m.metadata.gps_lat && m.metadata.gps_lng && (
                               <p className="text-[9px] opacity-50">📍 {Number(m.metadata.gps_lat).toFixed(5)}, {Number(m.metadata.gps_lng).toFixed(5)}</p>
                             )}
                           </div>
                         )}
                       </div>
                     ) : m.type === 'audio' ? <div className="px-4 py-3"><audio controls src={m.content} style={{ height: 36 }} /></div> : <p className="px-4 py-3 text-sm font-medium">{m.content}</p>}
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
        
        {/* Fotoğraf Etiket Modalı */}
        {photoLabelModal && (
          <div className="fixed inset-0 z-[9600] flex items-end justify-center bg-black/70 backdrop-blur-md p-4">
            <div className={`w-full max-w-sm rounded-3xl p-6 mb-4 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
              <h3 className={`font-black text-lg text-center mb-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>📸 Fotoğraf Etiketi</h3>
              <p className={`text-center text-xs mb-5 opacity-50 ${isDarkMode ? 'text-white' : 'text-black'}`}>Bu fotoğraf için bir etiket seç</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleFotoGonderWithLabel('teslim_aldim')}
                  className="py-4 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 font-black text-sm"
                >
                  📥 Teslim Aldım
                </button>
                <button
                  onClick={() => handleFotoGonderWithLabel('teslim_ettim')}
                  className="py-4 rounded-2xl bg-[#2ECC71]/20 border border-[#2ECC71]/40 text-[#2ECC71] font-black text-sm"
                >
                  📤 Teslim Ettim
                </button>
                <button
                  onClick={() => handleFotoGonderWithLabel(null)}
                  className={`py-3 rounded-2xl font-bold text-sm ${isDarkMode ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-500'}`}
                >
                  Etiketsiz Gönder
                </button>
                <button
                  onClick={() => { setPhotoLabelModal(false); setPendingPhotoFile(null); }}
                  className="py-2 text-xs text-red-400 font-bold"
                >
                  İptal
                </button>
              </div>
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
                      await updateProfileAfterReview(targetId, reviewRating);
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
