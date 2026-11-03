import { basename, join } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { BOARD_DIR } from '../shared/board';
import { ID_PATTERN } from '../shared/schemas';
import { createCellRunner, type CellItem } from './cells';
import { parseItemRequest } from './item-request';
import { originGuard } from './security';
import type { BoardStore } from './store';

export interface AppOptions {
  /** Root of the host repo post-lab was started in. */
  hostRoot: string;
  /** Port the browser talks to: post-lab's own port, or the Vite dev server's in development. */
  publicPort: number;
  /** Built UI to serve. Omitted in development, where Vite serves the UI. */
  uiDir?: string;
}

const FILES_PREFIX = '/api/files';

export function createApp({ hostRoot, publicPort, uiDir }: AppOptions, store: BoardStore): Hono {
  const app = new Hono();

  const cells = createCellRunner(hostRoot);

  app.use(originGuard(publicPort));
  app.get('/api/info', (c) => c.json({ repo: basename(hostRoot) }));
  app.get('/api/board', (c) => c.json(store.board()));
  app.get('/api/events', (c) =>
    streamSSE(c, async (stream) => {
      const aborted = new Promise<void>((resolve) => {
        stream.onAbort(resolve);
      });
      const unsubscribe = store.subscribe((event) => {
        void stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
      });
      await stream.write(': connected\n\n');
      await aborted;
      unsubscribe();
    }),
  );
  app.use('/api/items/:id', async (c, next) => {
    if (!ID_PATTERN.test(c.req.param('id'))) {
      return c.text(`Item IDs match ${ID_PATTERN.source}`, 400);
    }
    await next();
  });
  app.put('/api/items/:id', async (c) => {
    const parsed = parseItemRequest(await c.req.text());
    if (!parsed.ok) return c.text(parsed.message, 400);
    await store.putItem(c.req.param('id'), parsed.frontmatter, parsed.body);
    return c.body(null, 204);
  });
  app.delete('/api/items/:id', async (c) => {
    if (!(await store.deleteItem(c.req.param('id')))) return c.notFound();
    return c.body(null, 204);
  });
  app.post('/api/cells/:id/run', async (c) => {
    const id = c.req.param('id');
    const cell = store
      .board()
      .items.find((item): item is CellItem => item.id === id && item.type === 'cell');
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
