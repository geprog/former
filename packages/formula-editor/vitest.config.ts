import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// tests use the built former and formula packages (like a real app does), so build them first
export default defineConfig({
  plugins: [
    vue(),
  ],
  test: {
    environment: 'happy-dom',
  },
});
