import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    cssInjectedByJsPlugin(),
    dts({
      tsconfigPath: 'tsconfig.build.json',
      cleanVueFileName: true,
    }),
  ],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      name: 'former-ui',
      fileName: 'index',
      entry: resolve(__dirname, 'src/index.ts'),
    },
    outDir: 'dist',
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library (Vue)
      external: ['vue', '@formkit/core', '@formkit/vue', '@formkit/icons'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue',
          '@formkit/core': 'FormkitCore',
          '@formkit/vue': 'FormkitVue',
        },
        assetFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'style.css') return 'index.css';
          return chunkInfo.name as string;
        },
      },
    },
  },
});
