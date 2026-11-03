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
        // Each group takes the modules it matches plus their dependencies, highest priority
        // first, keeping every chunk under Vite's 500 kB warning. React Flow's d3 modules go
        // to `react` first, so the lazy chart chunks import from the eager ones and never the
        // other way round: such a cycle breaks module initialisation in the built UI.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|@xyflow)[\\/]/,
              priority: 5,
            },
            { name: 'radix', test: /node_modules[\\/](radix-ui|@radix-ui)[\\/]/, priority: 4 },
            // The d3 modules Vega uses (React Flow's own are already in `react`).
            { name: 'd3', test: /node_modules[\\/]d3-[^\\/]+[\\/]/, priority: 3 },
            // vega-embed pulls in Vega and Vega-Lite, which load only when a chart is shown.
            {
              name: 'vega',
              test: /node_modules[\\/]vega(-(?!embed|lite)[^\\/]+)?[\\/]/,
              priority: 2,
            },
            { name: 'vega-lite', test: /node_modules[\\/]vega-lite[\\/]/, priority: 1 },
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
