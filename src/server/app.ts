import { basename } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { originGuard } from './security';

export interface AppOptions {
  /** Root of the host repo post-lab was started in. */
  hostRoot: string;
  /** Port the browser talks to: post-lab's own port, or the Vite dev server's in development. */
  publicPort: number;
  /** Built UI to serve. Omitted in development, where Vite serves the UI. */
  uiDir?: string;
}

export function createApp({ hostRoot, publicPort, uiDir }: AppOptions): Hono {
  const app = new Hono();

  app.use(originGuard(publicPort));
  app.get('/api/info', (c) => c.json({ repo: basename(hostRoot) }));

  if (uiDir !== undefined) {
    app.use('/*', serveStatic({ root: uiDir }));
  }

  return app;
}
