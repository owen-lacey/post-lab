import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { DEV_SERVER_PORT, DEV_UI_PORT } from './src/shared/dev-ports.ts';

export default defineConfig({
  root: 'src/ui',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src/ui', import.meta.url)) },
  },
  build: {
    outDir: '../../dist/ui',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: DEV_UI_PORT,
    strictPort: true,
    open: true,
    proxy: {
      // Object form: the string shorthand sets changeOrigin, which rewrites Host and fails the
      // server's Host check. The server expects the browser's own Host and Origin.
      '/api': { target: `http://127.0.0.1:${String(DEV_SERVER_PORT)}`, changeOrigin: false },
    },
  },
});
