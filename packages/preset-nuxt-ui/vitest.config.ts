import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// tests use the built former package (like a real app does), so build it first
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
  },
});
