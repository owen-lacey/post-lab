import { fileURLToPath } from 'node:url';
import { startServer } from './server/start';
import { DEV_SERVER_PORT, DEV_UI_PORT } from './shared/dev-ports';

// Development server: serves /api for the Vite dev server against the demo host repo.
// Sessions live in memory, so each restart prints a fresh sign-in link.
const server = await startServer({
  hostRoot: fileURLToPath(new URL('../examples/demo', import.meta.url)),
  port: DEV_SERVER_PORT,
  publicPort: DEV_UI_PORT,
});
console.log(`Sign in: ${server.signInUrl}`);
