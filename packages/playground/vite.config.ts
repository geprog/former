import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      '5173-ammarkaraja-former-08kqzylvsw0.ws-eu121.gitpod.io',
      '.gitpod.io',
    ],
    hmr: {
      host: '5173-ammarkaraja-former-08kqzylvsw0.ws-eu121.gitpod.io',
      protocol: 'wss',
      clientPort: 443,
    },
  },
  optimizeDeps: { exclude: ['former-ui'] },
});
