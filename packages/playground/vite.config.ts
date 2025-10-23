import { fileURLToPath, URL } from 'node:url';
import ui from '@nuxt/ui/vite';
import tailwind from '@tailwindcss/postcss';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [vue(), ui()],
  css: { postcss: { plugins: [tailwind()] } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    dedupe: ['vue'],
  },
  optimizeDeps: { exclude: ['former-ui', '@former-ui/preset-nuxt-ui'] },
});
