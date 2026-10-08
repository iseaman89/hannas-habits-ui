import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // The libraries change far less often than the app. In their own files (named by a hash
        // of their content, cached "immutable" by nginx) a deploy that only touches the app
        // makes the browser fetch the app's chunk again and not the framework with it.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
          ) {
            return 'react';
          }
          if (/node_modules\/(zod|react-hook-form|@hookform)\//.test(id)) return 'forms';
          return 'vendor';
        },
      },
    },
  },
  resolve: {
    // Keep in sync with `paths` in tsconfig.app.json.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // The autosave tests wait for the real 800 ms pause before a write. On a busy machine (CI, or
    // a laptop compiling something) the default 5 s was hit once in a full run.
    testTimeout: 15_000,
    // Required at start-up by shared/api/config.ts; no real server behind it.
    env: { VITE_API_URL: 'http://api.test/api' },
  },
});
