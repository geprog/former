import { defineConfig } from 'vitest/config';

// tests of the vue entry use the built former package (like a real app does), so build it first
export default defineConfig({
  test: {
    environment: 'happy-dom',
  },
});
