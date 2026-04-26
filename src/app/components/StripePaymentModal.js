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
function CheckoutForm({ amount, requestId, onSuccess, onClose, isDarkMode, supabase }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const commission = Math.round(amount * PLATFORM_COMMISSION * 100) / 100;
  const total = amount + commission;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    try {
      // 1. PaymentMethod oluştur (kart bilgilerini Stripe'a gönder)
      const cardElement = elements.getElement(CardElement);
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      if (pmError) throw new Error(pmError.message);

      // 2. Escrow hold endpoint'ini çağır
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/stripe/escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'hold',
          requestId,
          amount: total, // Komisyon dahil toplam
          paymentMethodId: paymentMethod.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ödeme başarısız');

      // 3. Stripe'ın 3DS/confirmation gerektirip gerektirmediğini kontrol et
      if (data.requiresAction) {
        const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
        if (confirmError) throw new Error(confirmError.message);
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
        <p className="text-[10px] opacity-40">Hizmet veren {amount.toFixed(2)} alır. Para iş onaylanana kadar güvende tutulur.</p>
      </div>

      {/* Stripe CardElement */}
      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
        <p className={`text-xs opacity-60 mb-3 ${isDarkMode ? 'text-white' : 'text-black'}`}>Kart Bilgileri</p>
        <CardElement options={cardStyle} />
      </div>

      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full py-4 bg-[#635BFF] text-white rounded-2xl font-black text-sm uppercase tracking-wide disabled:opacity-50 hover:scale-[1.02] transition-transform"
      >
        {loading ? '⏳ İşleniyor...' : `Güvenli Öde · ${total.toFixed(2)}`}
      </button>

      <p className="text-[10px] text-center opacity-30">
        🔒 Stripe tarafından şifrelenerek korunur
      </p>
    </form>
  );
}

// Modal wrapper
export default function StripePaymentModal({ amount, requestId, onSuccess, onClose, isDarkMode, supabase }) {
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
          />
        </Elements>
      </div>
    </div>
  );
}
