import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from './start';

interface Reply {
  status: number;
  body: string;
}

function freePort(): Promise<number> {
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

function send(
  port: number,
  path: string,
  { method = 'GET', headers = {} }: { method?: string; headers?: Record<string, string> } = {},
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        headers: { host: `127.0.0.1:${String(port)}`, ...headers },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, body });
        });
      },
    );
    req.once('error', reject);
    req.end();
  });
}

describe('server security', () => {
  let port: number;
  let server: RunningServer;

  beforeEach(async () => {
    port = await freePort();
    server = await startServer({ hostRoot: '/tmp/host-repo', port, publicPort: port });
  });

  afterEach(async () => {
    await server.close();
  });

  it('serves the API to requests naming its own host', async () => {
    const reply = await send(port, '/api/info');
    expect(reply.status).toBe(200);
    expect(JSON.parse(reply.body)).toEqual({ repo: 'host-repo' });
  });

  it('rejects a foreign Host header (DNS rebinding)', async () => {
    const reply = await send(port, '/api/info', {
      headers: { host: `evil.example:${String(port)}` },
    });
    expect(reply.status).toBe(403);
  });

  it('rejects state-changing requests from another origin, an opaque origin or no origin', async () => {
    const foreign = await send(port, '/api/info', {
      method: 'POST',
      headers: { origin: 'http://evil.example' },
    });
    const opaque = await send(port, '/api/info', { method: 'POST', headers: { origin: 'null' } });
    const missing = await send(port, '/api/info', { method: 'POST' });
    expect(foreign.status).toBe(403);
    expect(opaque.status).toBe(403);
    expect(missing.status).toBe(403);
  });

  it('lets state-changing requests from its own origin through', async () => {
    const reply = await send(port, '/api/info', {
      method: 'POST',
      headers: { origin: `http://localhost:${String(port)}` },
    });
    expect(reply.status).toBe(404);
  });

  it('fails to start when the port is already in use', async () => {
    await expect(
      startServer({ hostRoot: '/tmp/host-repo', port, publicPort: port }),
    ).rejects.toMatchObject({ code: 'EADDRINUSE' });
  });
});
