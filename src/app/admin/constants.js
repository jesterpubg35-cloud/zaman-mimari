/**
 * Admin Panel Constants
 * SonarQube String Literal Duplication çözümü
 */

// Tailwind Renk Sınıfları - Tekrarlanan string'ler
export const COLORS = {
  // Zinc Palette
  ZINC_400: 'text-zinc-400',
  ZINC_500: 'text-zinc-500',
  ZINC_600: 'text-zinc-600',
  ZINC_800: 'text-zinc-800',
  ZINC_900: 'bg-zinc-900',
  ZINC_950: 'bg-zinc-950',
  
  // Border
  BORDER_ZINC_800: 'border-zinc-800',
  BORDER_ZINC_900: 'border-zinc-900',
  
  // Accent
  EMERALD_400: 'text-emerald-400',
  EMERALD_500: 'text-emerald-500',
  EMERALD_500_BG: 'bg-emerald-500',
  
  // Base
  WHITE: 'text-white',
  BLACK: 'text-black',
};

// Boyut/Typography Sabitleri
export const TYPOGRAPHY = {
  // Font Sizes
  TEXT_9: 'text-[9px]',
  TEXT_10: 'text-[10px]',
  TEXT_11: 'text-[11px]',
  TEXT_12: 'text-[12px]',
  TEXT_SM: 'text-sm',
  
  // Font Weights
  FONT_BOLD: 'font-bold',
  FONT_BLACK: 'font-black',
  
  // Tracking
  TRACKING_WIDER: 'tracking-wider',
  TRACKING_WIDEST: 'tracking-widest',
  
  // Transform
  UPPERCASE: 'uppercase',
};

// Layout Sabitleri
export const LAYOUT = {
  // Border Radius
  ROUNDED_XL: 'rounded-xl',
  ROUNDED_2XL: 'rounded-2xl',
  
  // Spacing
  P_4: 'p-4',
  P_5: 'p-5',
  PX_4: 'px-4',
  PY_3: 'py-3',
  
  // Flex
  FLEX: 'flex',
  FLEX_COL: 'flex-col',
  ITEMS_CENTER: 'items-center',
  JUSTIFY_BETWEEN: 'justify-between',
  FLEX_SHRINK_0: 'flex-shrink-0',
  
  // Position
  ABSOLUTE: 'absolute',
  RELATIVE: 'relative',
  RIGHT_0: 'right-0',
  Z_9998: 'z-[9998]',
};

// Durum Sabitleri
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
};

// Admin Panel Metinleri
export const LABELS = {
  ADMIN_PANEL: 'Admin Paneli',
  LIVE: 'Canlı',
  NO_NOTIFICATIONS: 'Henüz bildirim yok',
  LOADING: 'Yükleniyor...',
  NO_DATA: 'Veri yok',
  SAVE: 'Kaydet',
  CANCEL: 'İptal',
  DELETE: 'Sil',
  EDIT: 'Düzenle',
  SEARCH: 'Ara...',
  CLOSE: 'Kapat',
};

// Zaman Formatları
export const TIME_FORMAT = {
  TURKEY: 'tr-TR',
  HOUR_MINUTE: { hour: '2-digit', minute: '2-digit' },
  HOUR_MINUTE_SECOND: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
};

// API Endpoints
export const ENDPOINTS = {
  ADMIN_USERS: '/api/admin/users',
  ADMIN_AUTH: '/api/admin/auth',
  ADMIN_SECURITY: '/api/admin/security',
};

// CSS Class Combinations (Sık kullanılan kombinasyonlar)
export const CLASS_COMBOS = {
  CARD_BASE: 'bg-zinc-900 border border-zinc-800 rounded-xl',
  MODAL_BASE: 'bg-zinc-900 border border-zinc-800 rounded-2xl',
  HEADER_BASE: 'text-[11px] font-black text-zinc-400 uppercase tracking-widest',
  BUTTON_PRIMARY: 'bg-emerald-500 text-black font-black uppercase tracking-wider',
  BUTTON_SECONDARY: 'bg-zinc-800 text-white font-bold',
  TEXT_MUTED: 'text-zinc-500 text-[11px]',
  TEXT_DIM: 'text-zinc-600 text-xs',
};
