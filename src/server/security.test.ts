import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from './start';
import { freePort, makeHost, send } from './test-helpers';

describe('server security', () => {
  let port: number;
  let hostRoot: string;
  let server: RunningServer;

  beforeEach(async () => {
    port = await freePort();
    hostRoot = await makeHost({ '.post-lab/README.md': '' });
    server = await startServer({ hostRoot, port, publicPort: port });
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
    await expect(startServer({ hostRoot, port, publicPort: port })).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
  });
});
