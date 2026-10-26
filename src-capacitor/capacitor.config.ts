import { defineCapacitorConfig } from '@quasar/app-vite/capacitor';

export default defineCapacitorConfig({
  appId: 'net.toneflix.music',
  appName: 'Toneflix Music',
  backgroundColor: '#0a0c10',
  plugins: {
    PushNotifications: {
      // Also show notifications in the tray while the app is open
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      backgroundColor: '#0a0c10',
    },
  },
});
