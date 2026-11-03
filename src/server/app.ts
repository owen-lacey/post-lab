import { basename, join } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { BOARD_DIR } from '../shared/board';
import { loadBoard } from './board';
import { createCellRunner, type CellItem } from './cells';
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

  const cells = createCellRunner(hostRoot);

  app.use(originGuard(publicPort));
  app.get('/api/info', (c) => c.json({ repo: basename(hostRoot) }));
  app.get('/api/board', async (c) => c.json(await loadBoard(hostRoot)));
  app.post('/api/cells/:id/run', async (c) => {
    const id = c.req.param('id');
    const { items } = await loadBoard(hostRoot);
    const cell = items.find((item): item is CellItem => item.id === id && item.type === 'cell');
    if (cell === undefined) return c.notFound();
    if (cells.isRunning(id)) return c.text('This cell is already running', 409);
    return c.json(await cells.run(cell));
  });
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
