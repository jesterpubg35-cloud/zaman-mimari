'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

const PLATFORM_COMMISSION = 0.10; // %10

// Gerçek kart formu (Elements içinde çalışır)
function CheckoutForm({ amount, requestId, onSuccess, onClose, isDarkMode, supabase, walletBalance }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payMethod, setPayMethod] = useState(walletBalance >= (amount + Math.round(amount * PLATFORM_COMMISSION * 100) / 100) ? 'wallet' : 'card');

  const commission = Math.round(amount * PLATFORM_COMMISSION * 100) / 100;
  const total = amount + commission;
  const walletSufficient = walletBalance >= total;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (payMethod === 'wallet') {
        // Cüzdandan öde
        const res = await fetch('/api/stripe/escrow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: 'hold', requestId, amount, useWallet: true }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Ödeme başarısız');
      } else {
        // Kart ile öde
        if (!stripe || !elements) return;
        const cardElement = elements.getElement(CardElement);
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({ type: 'card', card: cardElement });
        if (pmError) throw new Error(pmError.message);

        const res = await fetch('/api/stripe/escrow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: 'hold', requestId, amount: total, paymentMethodId: paymentMethod.id }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Ödeme başarısız');

        if (data.requiresAction) {
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret);
          if (confirmError) {
            // 3D Secure hatası kontrolü
            if (confirmError.code === 'card_declined' || 
                confirmError.decline_code === 'authentication_required' ||
                confirmError.message?.includes('3D Secure') ||
                confirmError.message?.includes('authentication')) {
              throw new Error('Güvenlik politikamız gereği 3D Secure doğrulaması yapılamayan kartlar kabul edilmemektedir. Lütfen başka bir kart deneyiniz.');
            }
            throw new Error(confirmError.message);
          }
          // 3DS sonrası hala requires_action varsa kart reddedildi demektir
          if (paymentIntent?.status === 'requires_action' || paymentIntent?.status === 'requires_confirmation') {
            throw new Error('Güvenlik politikamız gereği 3D Secure doğrulaması yapılamayan kartlar kabul edilmemektedir.');
          }
        }
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    style: {
      base: {
        color: isDarkMode ? '#ffffff' : '#000000',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        '::placeholder': { color: isDarkMode ? '#666666' : '#999999' },
      },
      invalid: { color: '#ef4444' },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Özet */}
      <div className={`rounded-2xl p-4 space-y-2 text-sm ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
        <div className="flex justify-between">
          <span className="opacity-60">İş bedeli</span>
          <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-60">Platform ücreti (%10)</span>
          <span className="text-yellow-400 font-bold">{commission.toFixed(2)}</span>
        </div>
        <div className={`flex justify-between pt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
          <span className="font-bold">Toplam ödenecek</span>
          <span className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>{total.toFixed(2)}</span>
        </div>
        <p className="text-[10px] opacity-40">Para iş onaylanana kadar güvende tutulur.</p>
      </div>

      {/* Ödeme Yöntemi Seçimi */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPayMethod('wallet')}
          className={`py-3 rounded-2xl text-xs font-black border transition-all ${payMethod === 'wallet' ? 'bg-[#2ECC71] text-black border-[#2ECC71]' : isDarkMode ? 'bg-white/5 text-white/60 border-white/10' : 'bg-gray-100 text-black/60 border-black/10'}`}
        >
          💰 Cüzdan
          <p className={`text-[9px] font-normal mt-0.5 ${payMethod === 'wallet' ? 'text-black/60' : 'opacity-40'}`}>
            Bakiye: {walletBalance.toFixed(2)}
            {!walletSufficient && ' (yetersiz)'}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setPayMethod('card')}
          className={`py-3 rounded-2xl text-xs font-black border transition-all ${payMethod === 'card' ? 'bg-[#635BFF] text-white border-[#635BFF]' : isDarkMode ? 'bg-white/5 text-white/60 border-white/10' : 'bg-gray-100 text-black/60 border-black/10'}`}
        >
          💳 Kart
          <p className={`text-[9px] font-normal mt-0.5 ${payMethod === 'card' ? 'text-white/60' : 'opacity-40'}`}>Kredi/Banka kartı</p>
        </button>
      </div>

      {/* Kart formu - sadece kart seçiliyse */}
      {payMethod === 'card' && (
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
          <p className={`text-xs opacity-60 mb-3 ${isDarkMode ? 'text-white' : 'text-black'}`}>Kart Bilgileri</p>
          <CardElement options={cardStyle} />
        </div>
      )}

      {payMethod === 'wallet' && !walletSufficient && (
        <p className="text-red-400 text-xs text-center">Cüzdan bakiyeniz yetersiz. Lütfen önce para yatırın veya kart ile ödeyin.</p>
      )}

      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || (payMethod === 'card' && !stripe) || (payMethod === 'wallet' && !walletSufficient)}
        className={`w-full py-4 text-white rounded-2xl font-black text-sm uppercase tracking-wide disabled:opacity-50 active:scale-95 transition-transform ${payMethod === 'wallet' ? 'bg-[#2ECC71] text-black' : 'bg-[#635BFF]'}`}
      >
        {loading ? '⏳ İşleniyor...' : payMethod === 'wallet' ? `💰 Cüzdandan Öde · ${total.toFixed(2)}` : `💳 Kart ile Öde · ${total.toFixed(2)}`}
      </button>

      <p className="text-[10px] text-center opacity-30">
        🔒 Güvenli ödeme
      </p>
    </form>
  );
}

// Modal wrapper
export default function StripePaymentModal({ amount, requestId, onSuccess, onClose, isDarkMode, supabase, walletBalance = 0 }) {
  if (!amount || !requestId) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-t-[32px] p-6 pb-10 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`font-black text-lg uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>
            💳 Ödeme
          </h2>
          <button onClick={onClose} className="text-2xl opacity-40">✕</button>
        </div>

        <Elements stripe={stripePromise}>
          <CheckoutForm
            amount={amount}
            requestId={requestId}
            onSuccess={onSuccess}
            onClose={onClose}
            isDarkMode={isDarkMode}
            supabase={supabase}
            walletBalance={walletBalance}
          />
        </Elements>
      </div>
    </div>
  );
}
