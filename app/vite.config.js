import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the app is served from /Aine_forge_app-design/.
// Locally (dev/build) it stays at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Aine_forge_app-design/' : '/',
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    // In dev, forward API calls to `wrangler dev` (the Worker) on :8787,
    // so the app works without setting VITE_API_BASE.
    proxy: {
      '/ask': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
}));
