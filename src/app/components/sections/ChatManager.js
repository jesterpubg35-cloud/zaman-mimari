'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const VIOLATION_KEYWORDS = ['havale', 'eft', 'iban', 'para gönder', 'dışarı öde', 'kapora', 'peşin'];

// ChatManager Component - page.js'ten ayrıldı (Performance Optimization)
export default function ChatManager({ 
  aktifIs, 
  user, 
  onClose, 
  t,
  isDarkMode = false,
  showToast
}) {
  const [mesajlar, setMesajlar] = useState([]);
  const [yeniMesaj, setYeniMesaj] = useState('');
  const [mesajGonderiliyor, setMesajGonderiliyor] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [karsiYaziyor, setKarsiYaziyor] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const messagesEndRef = useRef(null);
  const messageChannelRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Mesajları yükle
  useEffect(() => {
    if (!aktifIs?.id || !user) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('request_id', aktifIs.id)
        .order('created_at', { ascending: true });
      if (data) setMesajlar(data);
    };
    loadMessages();
  }, [aktifIs?.id, user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!aktifIs?.id || !user) return;

    const channel = supabase.channel(`messages:${aktifIs.id}`)
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        setMesajlar(prev => {
          if (prev.find(m => m.id === payload.id || m.id === payload.temp_id)) return prev;
          return [...prev, payload];
        });
        if (payload.sender_id !== user.id) {
          setUnreadCount(c => c + 1);
        }
      })
      .on('broadcast', { event: 'typing' }, () => {
        setKarsiYaziyor(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setKarsiYaziyor(false), 2000);
      })
      .subscribe();

    messageChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [aktifIs?.id, user?.id]);

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mesajlar]);

  const checkMessageViolation = useCallback((content) => {
    const lower = content.toLowerCase();
    const found = VIOLATION_KEYWORDS.filter(kw => lower.includes(kw.toLowerCase()));
    return found.length > 0 ? found : null;
  }, []);

  const handleMesajGonder = useCallback(async () => {
    if (!yeniMesaj.trim() || !aktifIs || !user) return;
    const content = yeniMesaj.trim();
    
    // Güvenlik kontrolü
    const violations = checkMessageViolation(content);
    if (violations) {
      showToast?.(t?.offPlatformWarning || 'Güvenlik uyarısı');
      try {
        await supabase.from('security_radar').insert({
          request_id: aktifIs.id,
          alert_type: 'chat_violation',
          severity: 'medium',
          reporter_id: user.id,
          reported_id: aktifIs.sender_id === user.id ? aktifIs.receiver_id : aktifIs.sender_id,
          details: `İhlal: ${violations.join(', ')}`
        });
      } catch {}
    }
    
    // Offline kontrolü
    if (!isOnline) {
      const queueItem = {
        type: 'message_insert',
        data: { request_id: aktifIs.id, sender_id: user.id, content, type: 'text' },
        ts: Date.now()
      };
      try {
        const key = 'radar_offline_queue';
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push(queueItem);
        localStorage.setItem(key, JSON.stringify(arr));
        showToast?.('Mesajınız bağlantı kurulduğunda gönderilecek');
        setYeniMesaj('');
      } catch {}
      return;
    }
    
    setMesajGonderiliyor(true);
    const tempId = `temp-${Date.now()}`;
    const msgData = { 
      id: tempId, 
      request_id: aktifIs.id, 
      sender_id: user.id, 
      content, 
      type: 'text', 
      created_at: new Date().toISOString() 
    };
    
    // Optimistic UI
    setMesajlar(prev => [...prev, msgData]);
    setYeniMesaj('');

    // Broadcast
    messageChannelRef.current?.send({ 
      type: 'broadcast', 
      event: 'new_message', 
      payload: msgData 
    });

    // DB Insert
    try {
      const { error } = await supabase.from('messages').insert([{
        request_id: aktifIs.id,
        sender_id: user.id,
        content,
        type: 'text'
      }]);
      if (error) throw error;
    } catch (error) {
      setMesajlar(prev => prev.filter(m => m.id !== tempId));
      setYeniMesaj(content);
      showToast?.(t?.msgNotSent || 'Mesaj gönderilemedi');
    } finally {
      setMesajGonderiliyor(false);
    }
  }, [yeniMesaj, aktifIs, user, isOnline, t, showToast, checkMessageViolation]);

  const handleTyping = useCallback((val) => {
    setYeniMesaj(val);
    if (!messageChannelRef.current || !user?.id) return;
    
    messageChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id }
    });
  }, [user?.id]);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Memoized karşı taraf bilgisi
  const karsiTaraf = useMemo(() => {
    if (!aktifIs || !user) return null;
    return aktifIs.sender_id === user.id ? aktifIs.receiver : aktifIs.sender;
  }, [aktifIs, user]);

  if (!aktifIs || !user) return null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {karsiTaraf?.name || 'Sohbet'}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className={isOnline ? 'text-green-500' : 'text-gray-400'}>
                {isOnline ? '● Çevrimiçi' : '○ Çevrimdışı'}
              </span>
              {karsiYaziyor && <span className="text-blue-400">yazıyor...</span>}
            </div>
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mesajlar.map((msg, idx) => {
          const isMine = msg.sender_id === user.id;
          return (
            <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                isMine 
                  ? 'bg-[#2ECC71] text-black rounded-br-none' 
                  : isDarkMode ? 'bg-white/10 text-white rounded-bl-none' : 'bg-gray-200 text-gray-900 rounded-bl-none'
              }`}>
                <p className="text-sm">{msg.content}</p>
                <span className={`text-[10px] ${isMine ? 'text-black/60' : isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={yeniMesaj}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleMesajGonder()}
            onFocus={markAsRead}
            placeholder={t?.messagePlaceholder || 'Mesaj yaz...'}
            className={`flex-1 px-4 py-3 rounded-full outline-none ${
              isDarkMode 
                ? 'bg-white/10 text-white placeholder-gray-500' 
                : 'bg-gray-100 text-gray-900 placeholder-gray-400'
            }`}
            disabled={mesajGonderiliyor}
          />
          <button
            onClick={handleMesajGonder}
            disabled={!yeniMesaj.trim() || mesajGonderiliyor}
            className="px-6 py-3 bg-[#2ECC71] text-black rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mesajGonderiliyor ? '...' : t?.send || 'Gönder'}
          </button>
        </div>
      </div>
    </div>
  );
}
