import { fileURLToPath } from 'node:url';
import { writeGuide } from './server/host';
import { startServer } from './server/start';
import { DEV_SERVER_PORT, DEV_UI_PORT } from './shared/dev-ports';

// Development server: serves /api for the Vite dev server against the demo host repo.
const hostRoot = fileURLToPath(new URL('../examples/demo', import.meta.url));
await writeGuide(hostRoot);
await startServer({
  hostRoot,
  port: DEV_SERVER_PORT,
  publicPort: DEV_UI_PORT,
});
console.log(`API for examples/demo on port ${String(DEV_SERVER_PORT)}`);
