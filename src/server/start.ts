import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { createApp, type AppOptions } from './app';
import { openBoardStore } from './store';

export interface ServerOptions extends AppOptions {
  /** Port post-lab listens on, on 127.0.0.1 only. */
  port: number;
}

export interface RunningServer {
  /** Where the browser opens the UI. */
  url: string;
  close: () => Promise<void>;
}

export async function startServer(options: ServerOptions): Promise<RunningServer> {
  const store = await openBoardStore(options.hostRoot);
  const app = createApp(options, store);
  try {
    const server = await new Promise<Server>((resolve, reject) => {
      const listening = serve(
        { fetch: app.fetch, port: options.port, hostname: '127.0.0.1' },
        () => {
          resolve(listening as Server);
        },
      );
      listening.once('error', reject);
    });
    return {
      url: `http://127.0.0.1:${String(options.publicPort)}/`,
      close: async () => {
        await store.close();
        await new Promise<void>((done, fail) => {
          server.close((error) => {
            if (error) fail(error);
            else done();
          });
          // Open event streams never end by themselves.
          server.closeAllConnections();
        });
      },
    };
  } catch (error) {
    await store.close();
    throw error;
  }
}
