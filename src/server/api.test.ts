import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startServer, type RunningServer } from './start';
import { freePort, makeHost, openEvents, send } from './test-helpers';

const CSP = 'sandbox allow-scripts';

describe('board API', () => {
  let port: number;
  let hostRoot: string;
  let server: RunningServer;

  beforeEach(async () => {
    port = await freePort();
    hostRoot = await makeHost({
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

  describe('saving items', () => {
    const NOTE =
      '---\ntype: note\nx: 40\ny: 80\nw: 240\nh: 180\nframe: fr4me001\ncolor: pink\n---\nOpen with the chart.\n\nReaders care.\n';
    const FRAME = '---\ntype: frame\nx: 0\ny: 0\nw: 640\nh: 420\ncolor: blue\n---\nAct 1\n';
    const origin = () => `http://127.0.0.1:${String(port)}`;
    const itemPath = (id: string) => join(hostRoot, '.post-lab/items', `${id}.md`);
    const put = (id: string, body: string) =>
      send(port, `/api/items/${id}`, { method: 'PUT', headers: { origin: origin() }, body });

    beforeEach(async () => {
      await writeFile(itemPath('n0te0001'), NOTE);
      await writeFile(itemPath('fr4me001'), FRAME);
      await vi.waitFor(async () => {
        const board = JSON.parse((await send(port, '/api/board')).body) as { items: unknown[] };
        expect(board.items).toHaveLength(3);
      });
    });

    it('rewrites only the position lines of a moved item', async () => {
      const content = {
        type: 'note',
        x: 52,
        y: 96,
        w: 240,
        h: 180,
        frame: 'fr4me001',
        color: 'pink',
        body: 'Open with the chart.\n\nReaders care.\n',
      };
      expect((await put('n0te0001', JSON.stringify(content))).status).toBe(204);
      expect(await readFile(itemPath('n0te0001'), 'utf8')).toBe(
        NOTE.replace('x: 40\ny: 80', 'x: 52\ny: 96'),
      );
      expect(await readFile(itemPath('fr4me001'), 'utf8')).toBe(FRAME);
      const board = JSON.parse((await send(port, '/api/board')).body) as { items: unknown[] };
      expect(board.items).toContainEqual({ ...content, id: 'n0te0001' });
    });

    it('rejects invalid items and IDs', async () => {
      const bad = await put('n0te0001', JSON.stringify({ type: 'note', body: '' }));
      expect(bad.status).toBe(400);
      expect(bad.body).toContain('x');
      expect((await put('n0te0001', '{')).status).toBe(400);
      expect((await put('n0te0001', JSON.stringify({ type: 'note' }))).status).toBe(400);
      const text = { type: 'text', x: 0, y: 0, w: 1, h: 1, body: '' };
      expect((await put('NOT-AN-ID', JSON.stringify(text))).status).toBe(400);
      expect(await readFile(itemPath('n0te0001'), 'utf8')).toBe(NOTE);
    });

    it('deletes item files', async () => {
      const del = () =>
        send(port, '/api/items/n0te0001', { method: 'DELETE', headers: { origin: origin() } });
      expect((await del()).status).toBe(204);
      await expect(readFile(itemPath('n0te0001'))).rejects.toThrow();
      expect((await del()).status).toBe(404);
    });
  });

  it('streams changes made on disk', async () => {
    const events = await openEvents(port);
    try {
      await writeFile(
        join(hostRoot, '.post-lab/items/aaaa0001.md'),
        '---\ntype: text\nx: 9\ny: 2\nw: 30\nh: 40\n---\nHello\n',
      );
      await vi.waitFor(() => {
        expect(events.text()).toContain(
          'event: item\ndata: {"type":"item","item":{"type":"text","x":9,"y":2,"w":30,"h":40,"id":"aaaa0001","body":"Hello\\n"}}\n\n',
        );
      }, 1000);
    } finally {
      events.close();
    }
  });
});
