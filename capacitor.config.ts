import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zamanmimari.app',
  appName: 'Zaman Mimari',
  webDir: 'public',
  server: {
    url: 'https://zaman-mimari.vercel.app',
    cleartext: false,
  },
};

export default config;
