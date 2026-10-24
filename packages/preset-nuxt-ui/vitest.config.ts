import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// tests use the built former package (like a real app does), so build it first
export default defineConfig({
  plugins: [
    vue(),
    // resolves the virtual modules of nuxt ui for tests that render its real components,
    // components are not auto-imported so that the other tests can stub them
    ui({ components: false, autoImport: false, dts: false, router: false }),
  ],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
  },
});
