import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zamanmimari.app',
  appName: 'Zaman Mimari',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.152:3000',
    cleartext: true,
  },
};

export default config;
