// Service Worker for Offline Tile Caching
const CACHE_NAME = 'leaflet-tiles-v4';
const TILE_CACHE_LIMIT = 5000; // ULTRA OVERKILL - 5000 tile cache

// Cache'lenecek tile URL pattern'leri
const TILE_URL_PATTERNS = [
  /https:\/\/.*\.basemaps\.cartocdn\.com\/.*\/\d+\/\d+\/\d+.png/,
  /https:\/\/mt\d+\.google\.com\/vt\/lyrs=m.*x=\d+.*y=\d+.*z=\d+/,
  /https:\/\/.*\.tile\.openstreetmap\.org\/.*\/\d+\/\d+\/\d+.png/,
];

// Install event - cache hazırlığı
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch event - tile caching DEVRE DIŞI (yeşil sorunu için)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Sadece tile isteklerini yakala ama cache'leme
  const isTileRequest = TILE_URL_PATTERNS.some(pattern => pattern.test(request.url));
  
  if (!isTileRequest) {
    return; // Diğer istekleri normal işle
  }
  
  // Tile'ları direkt network'ten çek, cache kullanma
  event.respondWith(fetch(request));
});

// Cache limitini kontrol et, eski tile'ları sil
async function cleanupCache(cache) {
  const keys = await cache.keys();
  
  if (keys.length > TILE_CACHE_LIMIT) {
    // En eski 100 tile'ı sil (FIFO)
    const toDelete = keys.slice(0, keys.length - TILE_CACHE_LIMIT + 100);
    for (const key of toDelete) {
      await cache.delete(key);
    }
    console.log('[SW] Cleaned up', toDelete.length, 'old tiles. Remaining:', keys.length - toDelete.length);
  }
}

// Prefetch tiles for nearby areas
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_TILE_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Tile cache cleared');
    });
  }
  
  // Preload specific tiles
  if (event.data && event.data.type === 'PREFETCH_TILES') {
    const urls = event.data.urls;
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            cache.put(url, response.clone());
          }
        } catch (e) {
          // Ignore prefetch errors
        }
      }
      console.log('[SW] Prefetched', urls.length, 'tiles');
    });
  }
});
