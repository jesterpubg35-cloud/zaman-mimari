'use client';

// ************************************************************
// SİSTEM ŞU AN GÜNCEL - BU YAZIYI GÖRÜYORSANIZ DOĞRU DOSYADIR
// ************************************************************

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  'https://tyjkwnmanagviijwjmqm.supabase.co',
  'sb_publishable_dSFyLYmA5rhQLF0nI2GENQ_P6Xe5UWb',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

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
const LOCATION_STALE_MS = 5 * 60 * 1000; // 5 dakika - kullanıcılar birbirini görebilsin
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState('tr');
  const t = useMemo(() => ({ ...(TRANSLATIONS.en || {}), ...(TRANSLATIONS[lang] || {}) }), [lang]);

  const [user, setUser] = useState(null);
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
  const [emailVerified, setEmailVerified] = useState(false);
  const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false);
  const [profileEditLoading, setProfileEditLoading] = useState(false);
  
  // Adres alanları
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');
  
  // Email değiştirme
  const [newEmail, setNewEmail] = useState('');
  const [oldEmailCode, setOldEmailCode] = useState('');
  const [newEmailCode, setNewEmailCode] = useState('');
  const [emailChangeStep, setEmailChangeStep] = useState('verify-old');
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  
  // Profil fotoğrafı
  const profilePhotoInputRef = useRef(null);
  
  // Çoklu rol seçimi
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [tempSelectedRoles, setTempSelectedRoles] = useState([]);
  const phoneVerifyStage = 'idle'; // deprecated
  const phoneVerifyCode = ''; // deprecated  
  const phoneVerifyOpen = false; // deprecated
  const [resetOpen, setResetOpen] = useState(false);
  const setPhoneVerifyOpen = () => {}; // deprecated
  const [resetTarget, setResetTarget] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetUsePhone, setResetUsePhone] = useState(false);
  const [resetPhoneDial, setResetPhoneDial] = useState('+90');
  const [resetPhone, setResetPhone] = useState('');
  const [resetPhoneCode, setResetPhoneCode] = useState('');
  const [resetPhoneSent, setResetPhoneSent] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [konum, setKonum] = useState(null);
  const [digerleri, setDigerleri] = useState([]);
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

  const [langMenuAcik, setLangMenuAcik] = useState(false);
  const [toast, setToast] = useState(null);

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
  const [isHydrated, setIsHydrated] = useState(false);

  const mapRef = useRef(null);
  const sonKonumRef = useRef(null);
  const seenPendingIdsRef = useRef(new Set());
  const seenCompletedIdsRef = useRef(new Set());
  const offerTimeoutRef = useRef(null);
  const aktifIsRef = useRef(null);
  const chatAcikRef = useRef(false);
  const konumRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mesajlar, chatAcik, karsiYaziyor]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }, []);

  const konumaGit = () => {
    if (konum && mapRef.current) {
      mapRef.current.setView([konum.lat, konum.lng], 16, { animate: true });
    }
  };

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
    setMounted(true);
    setIsHydrated(true); // Hydration tamamlandi
    
    const savedLang = localStorage.getItem('radar_lang');
    if (savedLang && TRANSLATIONS[savedLang]) setLang(savedLang);
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('type=recovery') && hash.includes('access_token')) {
        setRecoveryOpen(true);
        setResetOpen(true);
      }
    }
    
    // LocalStorage'dan adres ve rol bilgilerini oku (user'i session'dan yukle)
    const savedUser = localStorage.getItem('radar_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.address_line1 !== undefined) setAddressLine1(parsedUser.address_line1 || '');
        if (parsedUser.address_line2 !== undefined) setAddressLine2(parsedUser.address_line2 || '');
        if (parsedUser.city !== undefined) setAddressCity(parsedUser.city || '');
        if (parsedUser.district !== undefined) setAddressDistrict(parsedUser.district || '');
        if (parsedUser.neighborhood !== undefined) setAddressNeighborhood(parsedUser.neighborhood || '');
        if (parsedUser.postal_code !== undefined) setAddressPostalCode(parsedUser.postal_code || '');
        if (parsedUser.email_verified !== undefined) setEmailVerified(parsedUser.email_verified || false);
        // Roller localStorage'dan geri yukle
        if (parsedUser.roles && Array.isArray(parsedUser.roles) && parsedUser.roles.length > 0) {
          setSelectedRoles(parsedUser.roles);
          setTempSelectedRoles(parsedUser.roles);
        }
      } catch (e) {
        console.error('Error parsing saved user:', e);
      }
    }

    const loadUserFromSession = async (session) => {
      if (!session?.user) { setUser(null); return; }
      const { data: profile } = await supabase
        .from('profilkisi')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      if (profile) {
        const userData = {
          id: session.user.id,
          ...profile,
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
        const userRoles = profile.roles || (profile.role ? [profile.role] : ['musteri']);
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

    // Hizli yukleme - localStorage'dan once user'i goster
    const cachedUser = localStorage.getItem('radar_user');
    if (cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        if (parsedUser.id && parsedUser.email) {
          setUser(parsedUser);
          // Email dogrulama durumunu da localStorage'dan yukle
          if (parsedUser.email_verified !== undefined) {
            setEmailVerified(parsedUser.email_verified);
          }
        }
      } catch (e) {
        console.error('Error loading saved user:', e);
      }
    }
    
    // Sonra Supabase session'dan guncelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserFromSession(session);
      }
    });
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_e, session) => loadUserFromSession(session));

    let watchId = null;
    if (typeof window !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (sonKonumRef.current) {
            const mesafe = getDistance(sonKonumRef.current.lat, sonKonumRef.current.lng, coords.lat, coords.lng);
            if (mesafe < 5) return;
          }
          sonKonumRef.current = coords;
          setKonum(coords);
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const { error: upsertError } = await supabase.from('locations').upsert(
              { 
                user_id: session.user.id, 
                lat: coords.lat, 
                lng: coords.lng, 
                status: 'online', 
                last_seen: new Date().toISOString() 
              },
              { onConflict: 'user_id' }
            );
            if (upsertError) {
              // Sessizce geç - konum kaydetme kritik değil
              console.warn('Location upsert:', upsertError.message || upsertError.code || 'Unknown error');
            }
          }
        },
        (err) => console.error('Konum alınamadı:', err),
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      authSub.unsubscribe();
    };
  }, []);

  // ─── REALTIME LOGIC ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    console.log("Setting up main Realtime channels for user:", user.id);

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
        console.log(`Blocks channel status: ${status}`);
        if (error) console.error("Blocks channel error:", error);
      });

    // 2. LOCATIONS CHANNEL
    const loadLocations = async () => {
      const sinceIso = new Date(Date.now() - LOCATION_STALE_MS).toISOString();
      const { data, error } = await supabase.from('locations')
        .select('user_id, lat, lng, status, last_seen, profilkisi(name, role, roles, is_available, service_radius)')
        .gte('last_seen', sinceIso);
      if (error) { console.error('Locations load error:', error); return; }
      console.log('Yuklenen konum sayisi:', data?.length || 0, 'Filtre oncesi');
      const processed = (data || []).filter(d => d.user_id !== user.id).map(d => ({
        user_id: d.user_id, lat: d.lat, lng: d.lng, status: d.status, last_seen: d.last_seen,
        name: d.profilkisi?.name || 'Gizli',
        user_role: d.profilkisi?.role || 'musteri',
        roles: d.profilkisi?.roles,
        is_available: d.profilkisi?.is_available ?? true,
        service_radius: d.profilkisi?.service_radius ?? DEFAULT_SERVICE_RADIUS_M,
      }));
      console.log('Islenen digerleri sayisi:', processed.length);
      setDigerleri(processed);
    };
    loadLocations();

    const applyLocationRecord = async (rec) => {
      if (rec.user_id === user.id) return;
      if (!isLocationFresh(rec.last_seen)) {
        setDigerleri(prev => prev.filter(d => d.user_id !== rec.user_id));
        return;
      }
      const { data: profile } = await supabase.from('profilkisi').select('name, role, roles, is_available, service_radius').eq('user_id', rec.user_id).single();
      setDigerleri(prev => {
        const filtered = prev.filter(d => d.user_id !== rec.user_id);
        return [...filtered, {
          user_id: rec.user_id, lat: rec.lat, lng: rec.lng, status: rec.status, last_seen: rec.last_seen,
          name: profile?.name || 'Gizli', user_role: profile?.role || 'musteri', roles: profile?.roles, is_available: profile?.is_available ?? true,
          service_radius: profile?.service_radius ?? DEFAULT_SERVICE_RADIUS_M,
        }];
      });
    };

    const locationChannel = supabase.channel('locations-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'locations' }, p => applyLocationRecord(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'locations' }, p => applyLocationRecord(p.new))
      .subscribe((status, error) => {
        console.log(`Locations channel status: ${status}`);
        if (error) console.error("Locations channel error:", error);
      });

    // 3. REQUESTS CHANNEL
    const processRequestChange = async (req) => {
      if (!req || (req.sender_id !== user.id && req.receiver_id !== user.id)) return;
      console.log("Request change received:", req.id, req.status);
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
      if (active) { setAktifIs(active); setCurrentStage(active.status || 'accepted'); if (active.delivery_code) setDeliveryCode(active.delivery_code); }
      
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

    return () => {
      console.log("Cleaning up main Realtime channels");
      supabase.removeChannel(blocksChannel);
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(requestChannel);
      requestChannelRef.current = null;
    };
  }, [user]);

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
      showToast(t.errorOccurred);
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

      const loggedUser = { id: data.user.id, ...profile };
      setUser(loggedUser);
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

      const loggedUser = { id: data.user.id, ...profile };
      setUser(loggedUser);
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
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: tempEmail.trim(),
        password: tempPassword,
      });
      if (authError) throw authError;
      
      const { data: profile, error: profileError } = await supabase
        .from('profilkisi')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();
      
      if (profileError) throw profileError;

      const loggedUser = { id: authData.user.id, ...profile };
      setUser(loggedUser);
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
        .single();
      
      if (existingEmail) {
        setAuthLoading(false);
        return alert('Bu e-posta adresi zaten kullanılıyor!');
      }
      
      if (phoneE164) {
        const { data: existingPhone } = await supabase
          .from('profilkisi')
          .select('phone')
          .eq('phone', phoneE164)
          .single();
        
        if (existingPhone) {
          setAuthLoading(false);
          return alert('Bu telefon numarası zaten kullanılıyor!');
        }
      }
      
      // Email + şifre ile kayıt (doğrulama yok)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: tempEmail.trim(),
        password: tempPassword,
        options: {
          data: { name: tempName.trim(), phone: phoneE164 }
        }
      });
      
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
        is_available: true,
        service_radius: DEFAULT_SERVICE_RADIUS_M
      };
      
      const { error: profileError } = await supabase.from('profilkisi').insert(profileData);
      
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
    setTalepGonderiliyor(true);
    try {
      const { data, error } = await supabase.from('requests').insert([{
        sender_id: user.id, receiver_id: seciliKisi.user_id, title: isDetayi || `${t.jobRequestFrom}${user.name}`,
        price: teklifFiyat ? parseFloat(teklifFiyat) : null, status: 'pending', active_job: false,
      }]).select().single();
      if (error) throw error;
      setSentRequestId(data.id); sentRequestIdRef.current = data.id; setSeciliKisi(null); setIsDetayi(''); setTeklifFiyat('');
    } catch (err) { console.error('handleTalepGonder error:', err); alert(t.errorOccurred); } finally { setTalepGonderiliyor(false); }
  };

  const handleOfferCancel = async () => {
    if (!sentRequestId) return;
    const { error } = await supabase.from('requests').update({ status: 'cancelled' }).eq('id', sentRequestId);
    if (error) console.error('Cancel offer error:', error);
    setSentRequestId(null); sentRequestIdRef.current = null; showToast(t.offerCancelled);
  };

  const handleTalepKabul = async () => {
    if (!gelenTalep) return;
    const code = generateDeliveryCode();
    const { data, error } = await supabase.from('requests').update({ status: 'accepted', active_job: true, delivery_code: code }).eq('id', gelenTalep.id).select().single();
    if (error) console.error('Accept request error:', error);
    if (data) activateJob(data);
  };

  const handleTalepRed = async () => {
    if (!gelenTalep) return;
    const { error } = await supabase.from('requests').update({ status: 'rejected' }).eq('id', gelenTalep.id);
    if (error) console.error('Reject request error:', error);
    
    // Instant broadcast rejection
    if (requestChannelRef.current) {
      requestChannelRef.current.send({
        type: 'broadcast',
        event: 'rejection',
        payload: { sender_id: gelenTalep.sender_id, request_id: gelenTalep.id }
      });
    }
    
    setGelenTalep(null);
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
    const { data, error } = await supabase.from('requests').update({ status: nextStage }).eq('id', aktifIs.id).select().single();
    if (error) console.error('Advance stage error:', error);
    if (data) { setAktifIs(data); setCurrentStage(nextStage); }
  };

  const handleTamamla = async () => {
    if (!aktifIs || !user) return;
    const isSender = aktifIs.sender_id === user.id;
    const updateData = isSender ? { sender_completed: true } : { receiver_completed: true };
    const merged = { ...aktifIs, ...updateData };
    if (merged.sender_completed && merged.receiver_completed) { updateData.status = 'completed'; updateData.active_job = false; }
    const { data, error } = await supabase.from('requests').update(updateData).eq('id', aktifIs.id).select().single();
    if (error) console.error('Complete job error:', error);
    if (data) {
      setAktifIs(data);
      if (data.status === 'completed') {
        setAktifIs(null); setChatAcik(false); setCurrentStage('accepted'); setDeliveryCode(null); setCodeInput(''); setCodeVerified(false); setPhotoProofRequired(false); setMesajlar([]); setUnreadCount(0);
        setReviewHedef(isSender ? data.receiver_id : data.sender_id); setReviewAcik(true);
      }
    }
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

  const filteredDigerleri = useMemo(() => {
    console.log('Filtreleme - digerleri:', digerleri.length, 'filtre:', aktifFiltre, 'engelledigim:', myBlocks.size, 'beni engelleyen:', blockedByOthers.size);
    const result = digerleri.filter(u => {
      if (myBlocks.has(u.user_id) || blockedByOthers.has(u.user_id)) {
        console.log('Engellenen kullanici:', u.user_id);
        return false;
      }
      if (!isLocationFresh(u.last_seen)) {
        console.log('Eski konum:', u.user_id, u.last_seen);
        return false;
      }
      // is_available kontrolu kaldırıldı - her zaman görünsünler
      // Rol filtresi - çoklu rol desteği
      if (aktifFiltre !== 'hepsi') {
        const userRoles = u.roles || [u.user_role];
        if (!userRoles.includes(aktifFiltre)) return false;
      }
      return true;
    });
    console.log('Filtrelenmis sonuc:', result.length);
    return result;
  }, [digerleri, aktifFiltre, myBlocks, blockedByOthers]);

  const Map = useMemo(() => dynamic(() => import('react-leaflet').then((mod) => {
    const { MapContainer, TileLayer, Marker, useMap } = mod;
    const L = require('leaflet');
    function MapController({ mapRef }) { const map = useMap(); useEffect(() => { mapRef.current = map; }, [map]); return null; }
    
    // Rol bazlı renk belirle - önce tanımla
    const getRoleColor = (roles) => {
      if (!roles || roles.length === 0) return '#9ca3af';
      if (roles.includes('hepsi')) return '#9333ea'; // Mor
      if (roles.includes('kurye')) return '#fbbf24'; // Sarı
      if (roles.includes('siraci')) return '#22c55e'; // Yeşil  
      if (roles.includes('emanetci')) return '#3b82f6'; // Mavi
      return '#9ca3af';
    };
    
    const createMyIcon = (roles) => {
      const color = getRoleColor(roles || ['musteri']);
      return L.divIcon({ className: 'custom-icon', html: `<div style="position:relative;"><div style="width:16px;height:16px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 12px ${color};"></div><div style="position:absolute;top:-1px;right:-1px;width:6px;height:6px;background:#2ecc71;border-radius:50%;border:1px solid white;"></div></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
    };
    const createOtherIcon = (isSelected, isActive) => L.divIcon({ 
      className: 'custom-icon', 
      html: `
        <div style="
          position:relative;
          transform:scale(${isSelected ? '1.3' : '0.9'});
          transition:transform 0.2s;
        ">
          <div style="
            width:16px;height:16px;
            background:${isActive ? '#2ECC71' : '#9ca3af'};
            border-radius:50%;
            border:2px solid white;
            box-shadow:0 0 ${isActive ? '14px #2ECC71' : '8px rgba(156,163,175,0.5)'};
            ${isActive ? 'animation: marker-pulse 2s infinite;' : ''}
          "></div>
          <div style="position:absolute;top:-1px;right:-1px;width:6px;height:6px;background:#2ecc71;border-radius:50%;border:1px solid white;"></div>
        </div>
        <style>
          @keyframes marker-pulse {
            0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
            100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
          }
        </style>
      `, 
      iconSize: [16, 16], 
      iconAnchor: [8, 8] 
    });

    return function LeafletMap({ lat, lng, others, onSelect, selectedId, dark, activeJobUserIds, onProfileClick, currentUser }) {
      const themeUrl = dark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
      
      const createRoleIcon = (user, isSelected, isActive) => {
        const color = getRoleColor(user.roles || [user.user_role]);
        return L.divIcon({ 
          className: 'custom-icon', 
          html: `
            <div style="
              position:relative;
              transform:scale(${isSelected ? '1.3' : '0.9'});
              transition:transform 0.2s;
            ">
              <div style="
                width:16px;height:16px;
                background:${color};
                border-radius:50%;
                border:2px solid white;
                box-shadow:0 0 ${isActive ? '14px ' + color : '8px rgba(0,0,0,0.3)'};
                ${isActive ? 'animation: marker-pulse 2s infinite;' : ''}
              "></div>
              ${user.avatar_url ? `<img src="${user.avatar_url}" style="position:absolute;top:-4px;left:-4px;width:24px;height:24px;border-radius:50%;border:2px solid white;object-fit:cover;" />` : ''}
            </div>
            <style>
              @keyframes marker-pulse {
                0% { box-shadow: 0 0 0 0 ${color}80; }
                70% { box-shadow: 0 0 0 10px ${color}00; }
                100% { box-shadow: 0 0 0 0 ${color}00; }
              }
            </style>
          `, 
          iconSize: [24, 24], 
          iconAnchor: [12, 12] 
        });
      };
      
      return (
        <MapContainer 
          center={[lat || 38.411, lng || 27.158]} 
          zoom={15} 
          minZoom={3}
          maxZoom={19}
          style={{ height: '100%', width: '100%', backgroundColor: dark ? '#1a1a1a' : '#e5e5e5' }} 
          zoomControl={false}
          worldCopyJump={false}
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
          className={dark ? 'dark-map' : 'light-map'}
        >
          <MapController mapRef={mapRef} />
          <TileLayer 
            url={themeUrl} 
            noWrap={true}
            bounds={[[-90, -180], [90, 180]]}
            updateWhenIdle={true}
            updateInterval={100}
            keepBuffer={2}
            maxNativeZoom={19}
            minNativeZoom={3}
          />
          {lat && lng && <Marker position={[lat, lng]} icon={createMyIcon(currentUser?.roles || [currentUser?.user_role || 'musteri'])} />}
          {others.map(u => (
            <Marker 
              key={u.user_id} 
              position={[u.lat, u.lng]} 
              icon={createRoleIcon(u, selectedId === u.user_id, activeJobUserIds.includes(u.user_id))} 
              eventHandlers={{ click: () => onProfileClick ? onProfileClick(u) : onSelect(u) }} 
            />
          ))}
        </MapContainer>
      );
    };
  }), { ssr: false }), []);

  if (!mounted) return null;

  const activeJobUserIds = aktifIs ? [aktifIs.sender_id, aktifIs.receiver_id] : [];
  const isSender = aktifIs?.sender_id === user?.id;
  const bothConfirmedFlag = aktifIs?.sender_confirmed && aktifIs?.receiver_confirmed;

  if (!user) return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-[#0F0F0F] text-white">
      <div className="w-full max-w-md p-8 rounded-[40px] bg-[#121212] border border-white/5 shadow-2xl relative overflow-hidden">
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
                onClick={() => setIsLoginView(true)} 
                className={`text-sm font-black uppercase tracking-widest italic transition-all ${isLoginView ? 'text-[#2ECC71] border-b-2 border-[#2ECC71] pb-1' : 'text-white/20 hover:text-white/40'}`}
              >
                {t.login}
              </button>
              <button 
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
      {showRoleModal && (
        <div className="fixed inset-0 z-[12500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl p-6 bg-[#1a1a1a] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-black uppercase tracking-widest text-sm">{t.selectRolePrompt}</p>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-white/60 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['musteri', 'kurye', 'emanetci', 'siraci'].map(r => (
                <button 
                  key={r} 
                  onClick={() => { setTempRole(r); setShowRoleModal(false); }} 
                  className={`p-4 rounded-2xl border text-[11px] font-black transition-all uppercase tracking-wider ${tempRole === r ? 'bg-[#2ECC71] text-black border-transparent' : 'bg-white/5 border-transparent text-white'}`}
                >
                  <div className="text-2xl mb-2">{HIZMETLER[r]?.emoji}</div>
                  {r === 'musteri' ? t.customer : r === 'emanetci' ? t.emanci : r === 'kurye' ? t.courier : t.waiter}
                </button>
              ))}
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
  if (!mounted) {
    return (
      <main className="fixed inset-0 bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">Loading...</div>
      </main>
    );
  }

  return (
    <main className={`fixed inset-0 overflow-hidden ${isDarkMode ? 'bg-[#0F0F0F] text-white' : 'bg-white text-black'}`}>
      <audio id="radar-remote-audio" autoPlay playsInline style={{ display: 'none' }} />
      <div className="relative h-full w-full">
        <button 
          onClick={() => setAktifPage('menu')} 
          className="absolute top-12 left-6 z-[3000] p-4 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10"
        >
          <div className="w-6 h-0.5 bg-white mb-1.5"></div><div className="w-6 h-0.5 bg-white mb-1.5"></div><div className="w-4 h-0.5 bg-white"></div>
        </button>
        {aktifIs && !chatAcik && (
          <button 
            onClick={() => setChatAcik(true)} 
            className="absolute top-12 right-6 z-[3000] px-5 py-3 rounded-2xl bg-[#2ECC71] text-white text-xs font-black uppercase flex items-center gap-2 shadow-lg">
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
        <div className="h-full w-full" onClick={() => setSeciliKisi(null)}>
          <Map 
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
          />
        </div>
        <div className={`fixed inset-0 z-[5000] transition-opacity duration-300 ${aktifPage === 'menu' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAktifPage('map')}></div>
          <div className={`absolute inset-y-0 left-0 w-[80%] max-w-xs shadow-2xl transform transition-transform duration-500 ease-out flex flex-col p-8 overflow-y-auto ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} ${aktifPage === 'menu' ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center gap-4 mb-8 cursor-pointer" onClick={() => { setAktifPage('account'); }}>
              <div className="w-14 h-14 bg-[#2ECC71]/20 rounded-full flex items-center justify-center text-xl font-bold text-[#2ECC71]">{user.name[0].toUpperCase()}</div>
              <div className="flex-1">
                <p className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.name}</p>
                <p className="text-[#2ECC71] text-[10px] font-black uppercase">{t.myAccount}</p>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {['support', 'payment', 'history'].map(p => <button key={p} onClick={() => setAktifPage(p)} className={`w-full text-left py-3 px-2 font-semibold text-sm border-b transition-colors ${p !== 'support' ? 'opacity-40' : ''} ${isDarkMode ? 'text-white border-white/10' : 'text-black border-black/10'}`}>{t[p]}</button>)}
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
          <div className={`fixed inset-0 z-[6000] flex flex-col ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-white'}`}>
            <div className="flex items-center gap-4 p-6 pt-12"><button onClick={() => setAktifPage('menu')} className={`text-2xl ${isDarkMode ? 'text-white' : 'text-black'}`}>←</button><h2 className={`font-black text-xl uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.support}</h2></div>
            <div className="flex-1 overflow-y-auto px-6 pb-10">{[1, 2, 3].map(i => <Accordion key={i} title={t[`supportQ${i}`]} dark={isDarkMode}>{t[`supportA${i}`]}</Accordion>)}</div>
          </div>
        )}
        {aktifPage === 'account' && (
          <div className={`fixed inset-0 z-[6000] flex flex-col ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-white'}`}>
            <div className="flex items-center gap-4 p-6 pt-12">
              <button onClick={() => setAktifPage('menu')} className={`text-2xl ${isDarkMode ? 'text-white' : 'text-black'}`}>←</button>
              <h2 className={`font-black text-xl uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.myAccount}</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-6">
              {/* Profil Kartı - Fotoğraf tıklanabilir */}
              <div className={`rounded-3xl p-6 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
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
                  <button
                    onClick={() => setShowRoleModal(true)}
                    className="px-4 py-2 bg-[#2ECC71] text-black rounded-full text-xs font-black uppercase hover:bg-[#2ECC71]/90 transition-all whitespace-nowrap"
                  >
                    {t.wantToWork}
                  </button>
                </div>
              </div>
              
              {/* Kişisel Bilgiler */}
              <div className={`rounded-3xl p-6 space-y-4 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
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
              <div className={`rounded-3xl p-6 space-y-4 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                <h3 className={`font-bold text-sm uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>{t.deliveryAddress}</h3>
                
                <div className="space-y-1 flex-shrink-0 min-w-0">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{t.addressLine1}</p>
                  <input 
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder={t.streetAddress}
                    className={`w-full p-3 rounded-xl text-sm outline-none box-border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-white text-black'}`}
                    style={{ minWidth: 0 }}
                  />
                </div>
                
                <div className="space-y-1 flex-shrink-0 min-w-0">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{t.addressLine2}</p>
                  <input 
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder={t.aptSuite}
                    className={`w-full p-3 rounded-xl text-sm outline-none box-border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-white text-black'}`}
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
                      placeholder={t.cityPlaceholder}
                      className={`w-full p-3 rounded-xl text-sm outline-none box-border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-white text-black'}`}
                      style={{ minWidth: 0 }}
                    />
                  </div>
                  <div className="space-y-1 flex-shrink-0 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{t.district}</p>
                    <input 
                      type="text"
                      value={addressDistrict}
                      onChange={(e) => setAddressDistrict(e.target.value)}
                      placeholder={t.districtPlaceholder}
                      className={`w-full p-3 rounded-xl text-sm outline-none box-border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-white text-black'}`}
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
                      placeholder={t.neighborhoodPlaceholder}
                      className={`w-full p-3 rounded-xl text-sm outline-none box-border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-white text-black'}`}
                      style={{ minWidth: 0 }}
                    />
                  </div>
                  <div className="space-y-1 flex-shrink-0 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{t.postalCode}</p>
                    <input 
                      type="text"
                      value={addressPostalCode}
                      onChange={(e) => setAddressPostalCode(e.target.value)}
                      placeholder={t.postalPlaceholder}
                      className={`w-full p-3 rounded-xl text-sm outline-none box-border ${isDarkMode ? 'bg-white/10 text-white placeholder-gray-500' : 'bg-white text-black'}`}
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
            </div>
          </div>
        )}
        <div className={`absolute bottom-0 left-0 right-0 rounded-t-[40px] z-[3000] transition-transform duration-500 ${isDarkMode ? 'bg-[#121212]' : 'bg-white shadow-2xl'}`} style={{ transform: (sheetYukseklik === 1 && !seciliKisi) ? 'translateY(80%)' : 'translateY(0)' }}>
          <div className="w-full py-4 flex justify-center cursor-pointer" onClick={() => setSheetYukseklik(sheetYukseklik === 0 ? 1 : 0)}><div className="w-12 h-1.5 bg-gray-500/30 rounded-full"></div></div>
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
                          : `border-transparent ${isDarkMode ? 'bg-gray-500/5' : 'bg-gray-100'}`
                      }`}
                    >
                      <span className="text-xl mb-1">{emoji}</span>
                      <p className={`font-black text-[9px] uppercase italic ${isDarkMode ? 'text-white' : 'text-black'}`}>{label}</p>
                      <p className="text-[7px] opacity-40 font-bold uppercase mt-1 leading-tight">{desc}</p>
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
                        const rolesToSave = tempSelectedRoles.length > 0 ? tempSelectedRoles : ['musteri'];
                        console.log('Kaydedilecek roller:', rolesToSave);
                        const { error } = await supabase.from('profilkisi').update({ roles: rolesToSave }).eq('user_id', user.id);
                        if (error) {
                          console.error('Supabase hatası:', error);
                          showToast('Hata: ' + error.message);
                          return;
                        }
                        setSelectedRoles(rolesToSave);
                        const updatedUser = { ...user, roles: rolesToSave };
                        setUser(updatedUser);
                        localStorage.setItem('radar_user', JSON.stringify(updatedUser));
                        showToast(t.rolesSaved || 'Roller kaydedildi!');
                        setShowRoleModal(false);
                      } catch (err) {
                        console.error('Kaydet hatası:', err);
                        showToast('Bir hata oluştu');
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

export default function AppContentWrapper() {
  return <AppContent />;
}
