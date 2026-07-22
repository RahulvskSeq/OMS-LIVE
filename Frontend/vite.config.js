import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5002,
    proxy: {
      // Local dev convenience only. The app resolves its API base at runtime
      // from config.js (window.__API__), so this proxy is used solely if a
      // build is ever pointed at a same-origin "/api". Backend runs on :5000.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: { '@': '/src' },
  },
});
