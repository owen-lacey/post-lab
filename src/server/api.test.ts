import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openInEditor } from './editor';
import { startServer, type RunningServer } from './start';
import { freePort, makeHost, openEvents, send } from './test-helpers';

vi.mock('./editor', () => ({ openInEditor: vi.fn() }));

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

  describe('saving strokes', () => {
    const strokesPath = () => join(hostRoot, '.post-lab/strokes.json');
    const put = (body: string) =>
      send(port, '/api/strokes', {
        method: 'PUT',
        headers: { origin: `http://127.0.0.1:${String(port)}` },
        body,
      });
    const strokes = {
      strokes: [{ id: 'str0k001', color: 'red', size: 'm', points: [[0, 0, 0.5]] }],
    };

    it('writes strokes.json and serves it back', async () => {
      expect((await put(JSON.stringify(strokes))).status).toBe(204);
      expect(JSON.parse(await readFile(strokesPath(), 'utf8'))).toEqual(strokes);
      const board = JSON.parse((await send(port, '/api/board')).body) as { strokes: unknown };
      expect(board.strokes).toEqual(strokes);
    });

    it('rejects invalid strokes', async () => {
      expect((await put('{')).status).toBe(400);
      const bad = await put(JSON.stringify({ strokes: [{ id: 'str0k001', color: 'teal' }] }));
      expect(bad.status).toBe(400);
      expect(bad.body).toContain('color');
      await expect(readFile(strokesPath())).rejects.toThrow();
    });
  });

  describe('opening outputs in the editor', () => {
    const open = (path: string) =>
      send(port, path, { method: 'POST', headers: { origin: `http://127.0.0.1:${String(port)}` } });

    beforeEach(async () => {
      await writeFile(
        join(hostRoot, '.post-lab/items/aaaa0003.md'),
        '---\ntype: cell\nx: 0\ny: 0\nw: 300\nh: 200\ncommand: "true"\n---\n',
      );
      await vi.waitFor(async () => {
        const board = JSON.parse((await send(port, '/api/board')).body) as {
          outputs: Record<string, unknown>;
        };
        expect(board.outputs).toHaveProperty('aaaa0003');
      });
      vi.mocked(openInEditor).mockReset();
    });

    it('opens a listed output file', async () => {
      expect((await open('/api/cells/aaaa0003/outputs/chart.html/open')).status).toBe(204);
      expect(openInEditor).toHaveBeenCalledWith(
        join(hostRoot, '.post-lab/outputs/aaaa0003/chart.html'),
      );
    });

    it('says why when no editor can be found', async () => {
      vi.mocked(openInEditor).mockReturnValue('No editor found.');
      const reply = await open('/api/cells/aaaa0003/outputs/chart.html/open');
      expect([reply.status, reply.body]).toEqual([500, 'No editor found.']);
    });

    it('opens nothing but listed outputs', async () => {
      const paths = [
        '/api/cells/aaaa0003/outputs/missing.txt/open',
        '/api/cells/aaaa0003/outputs/..%2F..%2Fitems%2Faaaa0001.md/open',
        '/api/cells/aaaa0001/outputs/chart.html/open',
      ];
      for (const path of paths) expect((await open(path)).status).toBe(404);
      expect(openInEditor).not.toHaveBeenCalled();
    });
  });

  describe('uploading images', () => {
    const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
    const upload = (path: string, body: Buffer, type = 'image/png') =>
      send(port, path, {
        method: 'POST',
        headers: { origin: `http://127.0.0.1:${String(port)}`, 'content-type': type },
        body,
      });

    it('saves the image under assets/ and serves it back', async () => {
      const reply = await upload('/api/assets?id=1mage001', PNG);
      expect(reply.status).toBe(200);
      expect(JSON.parse(reply.body)).toEqual({ src: 'assets/1mage001.png' });
      expect(await readFile(join(hostRoot, '.post-lab/assets/1mage001.png'))).toEqual(PNG);

      const jpeg = await upload('/api/assets?id=1mage002', PNG, 'image/jpeg');
      expect(JSON.parse(jpeg.body)).toEqual({ src: 'assets/1mage002.jpg' });
    });

    it('creates assets/ when the board has none', async () => {
      const bare = await makeHost({ '.post-lab/items/.keep': '' });
      const barePort = await freePort();
      const bareServer = await startServer({
        hostRoot: bare,
        port: barePort,
        publicPort: barePort,
      });
      try {
        const reply = await send(barePort, '/api/assets?id=1mage001', {
          method: 'POST',
          headers: { origin: `http://127.0.0.1:${String(barePort)}`, 'content-type': 'image/gif' },
          body: PNG,
        });
        expect(reply.status).toBe(200);
        expect(await readFile(join(bare, '.post-lab/assets/1mage001.gif'))).toEqual(PNG);
      } finally {
        await bareServer.close();
      }
    });

    it('rejects bad IDs, non-images and images that are too large', async () => {
      expect((await upload('/api/assets?id=NOT-AN-ID', PNG)).status).toBe(400);
      expect((await upload('/api/assets', PNG)).status).toBe(400);
      expect((await upload('/api/assets?id=1mage001', PNG, 'text/html')).status).toBe(415);
      // Browsers declare a file's length up front; a declared length over the limit is refused
      // before any of the body is read.
      const huge = await send(port, '/api/assets?id=1mage001', {
        method: 'POST',
        headers: {
          origin: `http://127.0.0.1:${String(port)}`,
          'content-type': 'image/png',
          'content-length': String(25 * 1024 * 1024 + 1),
        },
      });
      expect(huge.status).toBe(413);
      await expect(readFile(join(hostRoot, '.post-lab/assets/1mage001.png'))).rejects.toThrow();
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
