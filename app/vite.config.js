import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the app is served from /Aine_forge_app-design/.
// Locally (dev/build) it stays at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Aine_forge_app-design/' : '/',
  plugins: [react()],
  server: { port: 5174, host: true },
}));
