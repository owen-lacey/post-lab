import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export interface Reply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() => {
        if (address !== null && typeof address === 'object') resolve(address.port);
        else reject(new Error('No port assigned'));
      });
    });
  });
}

export function send(
  port: number,
  path: string,
  {
    method = 'GET',
    headers = {},
    body,
  }: { method?: string; headers?: Record<string, string>; body?: string | Buffer } = {},
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path,
        agent: false, // no keep-alive, so the server closes at once after each test
        method,
        headers: { host: `127.0.0.1:${String(port)}`, ...headers },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
        });
      },
    );
    req.once('error', reject);
    req.end(body);
  });
}

export interface EventStream {
  /** Raw text received so far. */
  text: () => string;
  close: () => void;
}

/** Opens `GET /api/events` and resolves once the stream's headers have arrived. */
export function openEvents(port: number): Promise<EventStream> {
  return new Promise((resolve, reject) => {
    let text = '';
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path: '/api/events',
        agent: false,
        headers: { host: `127.0.0.1:${String(port)}` },
      },
      (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (text += chunk));
        res.once('data', () => {
          resolve({
            text: () => text,
            close: () => {
              req.destroy();
            },
          });
        });
      },
    );
    req.once('error', reject);
    req.end();
  });
}

/** Creates `<tmp>/host-repo` and writes the given files into it (paths relative to it). */
export async function makeHost(files: Record<string, string> = {}): Promise<string> {
  const hostRoot = join(await mkdtemp(join(tmpdir(), 'post-lab-')), 'host-repo');
  await mkdir(hostRoot);
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(hostRoot, path)), { recursive: true });
    await writeFile(join(hostRoot, path), content);
  }
  return hostRoot;
}
