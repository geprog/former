import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // test against the sources of former, so it doesn't need to be built first
      '@former-ui/former': fileURLToPath(new URL('../former/src/index.ts', import.meta.url)),
      '~': fileURLToPath(new URL('../former/src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
