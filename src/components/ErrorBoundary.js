'use client';

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, info?.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'linear-gradient(160deg, #16181c 0%, #0c0e12 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '2rem', textAlign: 'center',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" style={{ marginBottom: '1.25rem' }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <circle cx="12" cy="16" r="0.5" fill="rgba(255,255,255,0.4)" stroke="none"/>
          </svg>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
            Beklenmedik bir hata oluştu
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: '2rem', maxWidth: 280 }}>
            Uygulama güvenli biçimde durduruldu. Sayfayı yenileyerek devam edebilirsiniz.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{
              padding: '0.75rem 2rem', background: '#2ECC71', color: '#000',
              borderRadius: '999px', fontWeight: 700, fontSize: '0.875rem',
              border: 'none', cursor: 'pointer',
            }}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
