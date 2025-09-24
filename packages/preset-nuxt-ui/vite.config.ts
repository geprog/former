import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    vue(),
    dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: (_fmt, name) => `${name}.js`,
    },
    rollupOptions: {
      external: ['vue', '@nuxt/ui', 'former-ui'],
    },
  },
});
