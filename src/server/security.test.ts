import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from './start';

interface Reply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
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
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
        });
      },
    );
    req.once('error', reject);
    req.end();
  });
}

function sessionCookie(reply: Reply): string {
  const [cookie] = reply.headers['set-cookie'] as string[];
  return (cookie ?? '').split(';')[0] ?? '';
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

  const signInPath = () => new URL(server.signInUrl).pathname + new URL(server.signInUrl).search;

  async function signIn(): Promise<string> {
    const reply = await send(port, signInPath());
    expect(reply.status).toBe(302);
    return sessionCookie(reply);
  }

  it('rejects API calls without the session cookie', async () => {
    const reply = await send(port, '/api/info');
    expect(reply.status).toBe(401);
  });

  it('swaps the launch token for an HttpOnly, SameSite=Strict cookie that grants access', async () => {
    const reply = await send(port, signInPath());
    expect(reply.status).toBe(302);
    expect(reply.headers.location).toBe('/');
    const setCookie = (reply.headers['set-cookie'] as string[])[0] ?? '';
    expect(setCookie).toMatch(new RegExp(`^post-lab-session-${String(port)}=`));
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');

    const info = await send(port, '/api/info', { headers: { cookie: sessionCookie(reply) } });
    expect(info.status).toBe(200);
    expect(JSON.parse(info.body)).toEqual({ repo: 'host-repo' });
  });

  it('accepts the launch token only once', async () => {
    await signIn();
    const second = await send(port, signInPath());
    expect(second.status).toBe(401);
  });

  it('rejects a wrong launch token', async () => {
    const reply = await send(port, '/api/session?token=wrong');
    expect(reply.status).toBe(401);
    expect(reply.headers['set-cookie']).toBeUndefined();
  });

  it('rejects a foreign Host header even with a valid cookie (DNS rebinding)', async () => {
    const cookie = await signIn();
    const reply = await send(port, '/api/info', {
      headers: { host: `evil.example:${String(port)}`, cookie },
    });
    expect(reply.status).toBe(403);
  });

  it('rejects state-changing requests from another origin or with no origin', async () => {
    const cookie = await signIn();
    const foreign = await send(port, '/api/info', {
      method: 'POST',
      headers: { cookie, origin: 'http://evil.example' },
    });
    const missing = await send(port, '/api/info', { method: 'POST', headers: { cookie } });
    expect(foreign.status).toBe(403);
    expect(missing.status).toBe(403);
  });

  it('lets state-changing requests from its own origin through', async () => {
    const cookie = await signIn();
    const reply = await send(port, '/api/info', {
      method: 'POST',
      headers: { cookie, origin: `http://localhost:${String(port)}` },
    });
    expect(reply.status).toBe(404);
  });

  it('fails to start when the port is already in use', async () => {
    await expect(
      startServer({ hostRoot: '/tmp/host-repo', port, publicPort: port }),
    ).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
  });
});
