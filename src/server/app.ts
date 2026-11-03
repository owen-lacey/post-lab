import { basename, join } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { BOARD_DIR } from '../shared/board';
import { loadBoard } from './board';
import { originGuard } from './security';

export interface AppOptions {
  /** Root of the host repo post-lab was started in. */
  hostRoot: string;
  /** Port the browser talks to: post-lab's own port, or the Vite dev server's in development. */
  publicPort: number;
  /** Built UI to serve. Omitted in development, where Vite serves the UI. */
  uiDir?: string;
}

const FILES_PREFIX = '/api/files';

export function createApp({ hostRoot, publicPort, uiDir }: AppOptions): Hono {
  const app = new Hono();

  app.use(originGuard(publicPort));
  app.get('/api/info', (c) => c.json({ repo: basename(hostRoot) }));
  app.get('/api/board', async (c) => c.json(await loadBoard(hostRoot)));
  app.get(
    `${FILES_PREFIX}/:area{assets|outputs}/*`,
    async (c, next) => {
      // Files opened directly (an .html output, an .svg) get an opaque origin, so their
      // requests carry Origin: null and fail the Origin check.
      c.header('Content-Security-Policy', 'sandbox allow-scripts');
      await next();
    },
    serveStatic({
      root: join(hostRoot, BOARD_DIR),
      rewriteRequestPath: (path) => path.slice(FILES_PREFIX.length),
    }),
  );
  app.all('/api/*', (c) => c.notFound());

  if (uiDir !== undefined) {
    app.use('/*', serveStatic({ root: uiDir }));
  }

  return app;
}
