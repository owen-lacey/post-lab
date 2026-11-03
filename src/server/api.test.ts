import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from './start';
import { freePort, makeHost, send } from './test-helpers';

const CSP = 'sandbox allow-scripts';

describe('board API', () => {
  let port: number;
  let server: RunningServer;

  beforeEach(async () => {
    port = await freePort();
    const hostRoot = await makeHost({
      '.post-lab/items/aaaa0001.md': '---\ntype: text\nx: 1\ny: 2\nw: 30\nh: 40\n---\nHello\n',
      '.post-lab/items/aaaa0002.md': '---\ntype: text\n---\n',
      '.post-lab/assets/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
      '.post-lab/assets/with space.txt': 'spaced',
      '.post-lab/outputs/aaaa0003/chart.html': '<p>chart</p>',
      'secret.txt': 'outside the board',
    });
    server = await startServer({ hostRoot, port, publicPort: port });
  });

  afterEach(async () => {
    await server.close();
  });

  it('returns items, strokes and problems', async () => {
    const reply = await send(port, '/api/board');
    expect(reply.status).toBe(200);
    expect(JSON.parse(reply.body)).toMatchObject({
      items: [{ id: 'aaaa0001', type: 'text', x: 1, y: 2, w: 30, h: 40, body: 'Hello\n' }],
      strokes: { strokes: [] },
      problems: [{ path: '.post-lab/items/aaaa0002.md' }],
    });
  });

  it('serves assets and outputs sandboxed', async () => {
    const svg = await send(port, '/api/files/assets/logo.svg');
    expect(svg.status).toBe(200);
    expect(svg.headers['content-type']).toMatch(/^image\/svg\+xml/);
    expect(svg.headers['content-security-policy']).toBe(CSP);

    const html = await send(port, '/api/files/outputs/aaaa0003/chart.html');
    expect(html.status).toBe(200);
    expect(html.headers['content-security-policy']).toBe(CSP);

    const spaced = await send(port, '/api/files/assets/with%20space.txt');
    expect(spaced.body).toBe('spaced');
  });

  it('serves nothing outside assets/ and outputs/', async () => {
    const paths = [
      '/api/files/items/aaaa0001.md',
      '/api/files/README.md',
      '/api/files/assets/../items/aaaa0001.md',
      '/api/files/assets/%2e%2e/items/aaaa0001.md',
      '/api/files/assets/..%2f..%2fsecret.txt',
      '/api/files/assets/missing.png',
      '/api/nothing',
    ];
    for (const path of paths) {
      const reply = await send(port, path);
      expect([path, reply.status]).toEqual([path, 404]);
    }
  });
});
