import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

function isExternal(id: string): boolean {
  if (id === 'vue' || id === 'former-ui' || id === '@former-ui/former') {
    return true;
  }
  if (id.startsWith('@nuxt/ui')) {
    return true;
  }
  if (id.startsWith('vue/')) {
    return true;
  }
  return false;
}

export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsconfigPath: 'tsconfig.build.json',
      cleanVueFileName: true,
    }),
  ],
  build: {
    lib: {
      name: 'FormerPresetNuxtUi',
      fileName: 'index',
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    outDir: 'dist',
    minify: false,
    rollupOptions: {
      external: isExternal,
    },
  },
});
