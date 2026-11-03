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
    rolldownOptions: {
      output: {
        // vega-embed pulls in all of Vega, Vega-Lite and d3, which load only when a chart output
        // is shown. maxSize splits them into chunks under Vite's 500 kB size warning.
        codeSplitting: {
          groups: [
            {
              name: 'charts',
              test: /node_modules[\\/](vega(-[^\\/]+)?|d3-[^\\/]+)[\\/]/,
              maxSize: 450_000,
            },
          ],
        },
      },
    },
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
