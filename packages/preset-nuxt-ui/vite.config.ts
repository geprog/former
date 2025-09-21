import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const entries = {
  schemaComponent: fileURLToPath(new URL('./src/components/schemaComponent.ts', import.meta.url)),
};

export default defineConfig({
  plugins: [
    vue(),
    dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true }),
  ],
  build: {
    lib: {
      entry: entries,
      formats: ['es'],
      fileName: (_fmt, name) => `${name}.js`,
    },
    rollupOptions: {
      external: ['vue', '@nuxt/ui', 'former-ui'],
    },
  },
});
