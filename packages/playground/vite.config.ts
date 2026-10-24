import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';

// entry files of the workspace packages, their builds remove them while building (see `reloadOnPackageBuild`)
const packageEntries = [
  fileURLToPath(new URL('../former/dist/index.js', import.meta.url)),
  fileURLToPath(new URL('../preset-nuxt-ui/dist/index.mjs', import.meta.url)),
];

// A request during a package build fails with "Failed to resolve entry for package", because its
// dist folder is cleaned first. Vite doesn't retry such imports once the entry exists again (only
// imports that can't be resolved at all), and its watcher misses the recreated dist folder. So when
// an entry is removed, it is polled until the build wrote it again and the page is reloaded.
function reloadOnPackageBuild(entries: string[]): Plugin {
  return {
    name: 'reload-on-package-build',
    apply: 'serve',
    configureServer(server) {
      const waiting = new Set<string>();

      function reloadWhenBuilt(entry: string) {
        if (waiting.has(entry)) {
          return;
        }
        waiting.add(entry);
        const interval = setInterval(() => {
          if (!existsSync(entry)) {
            return;
          }
          clearInterval(interval);
          // the other files of the build are written right after the entry
          setTimeout(() => {
            waiting.delete(entry);
            server.config.logger.info(`${entry} was built, reloading`, { timestamp: true });
            server.ws.send({ type: 'full-reload' });
          }, 300);
        }, 200);
      }

      // entries that don't exist yet, e.g. because the packages are built while the playground starts
      entries.filter(entry => !existsSync(entry)).forEach(reloadWhenBuilt);
      server.watcher.on('unlink', (file) => {
        if (entries.includes(file)) {
          reloadWhenBuilt(file);
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    reloadOnPackageBuild(packageEntries),
    ui({
      router: false,
      scanPackages: ['@former-ui/preset-nuxt-ui'],
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
  optimizeDeps: { exclude: ['@former-ui/former', '@former-ui/preset-nuxt-ui'] },
});
