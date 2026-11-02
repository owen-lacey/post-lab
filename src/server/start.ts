import { serve } from '@hono/node-server';
import { createApp, type AppOptions } from './app';

export interface ServerOptions extends AppOptions {
  /** Port post-lab listens on, on 127.0.0.1 only. */
  port: number;
}

export interface RunningServer {
  /** Where the browser opens the UI. */
  url: string;
  close: () => Promise<void>;
}

export function startServer(options: ServerOptions): Promise<RunningServer> {
  const app = createApp(options);
  return new Promise((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port: options.port, hostname: '127.0.0.1' }, () => {
      resolve({
        url: `http://127.0.0.1:${String(options.publicPort)}/`,
        close: () =>
          new Promise((done, fail) => {
            server.close((error) => {
              if (error) fail(error);
              else done();
            });
          }),
      });
    });
    server.once('error', reject);
  });
}
