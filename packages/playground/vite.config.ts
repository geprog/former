import { fileURLToPath, URL } from 'node:url';
import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    ui({
      router: false,
      /* Let the playground’s own `.dark` wrapper control theme; otherwise VueUse
       * color-mode adds `dark` on `<html>` from system preference and every `dark:` utility wins. */
      colorMode: false,
      scanPackages: ['@former/preset-nuxt-ui'],
      ui: {
        formField: {
          slots: {
            root: 'w-full',
          },
        },
        input: {
          slots: {
            root: 'w-full',
          },
        },
        textarea: {
          slots: {
            root: 'w-full',
          },
        },
        inputDate: {
          slots: {
            base: 'w-full',
          },
        },
        select: {
          slots: {
            base: 'w-full',
          },
        },
        selectMenu: {
          slots: {
            base: 'w-full',
          },
        },
        inputMenu: {
          slots: {
            root: 'w-full',
          },
        },
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    allowedHosts: ['.gitpod.io'],
  },
  optimizeDeps: { exclude: ['former-ui', '@former/preset-nuxt-ui'] },
});
