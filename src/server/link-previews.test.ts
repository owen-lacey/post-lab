import { readFile, writeFile } from 'node:fs/promises';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLinkPreviews, type LinkPreviews } from './link-previews';
import { openBoardStore, type BoardStore } from './store';
import { freePort, makeHost } from './test-helpers';

const OG_PAGE = `<!doctype html><html><head>
<meta property="og:title" content="Churn, explained">
<meta property="og:description" content=" Why customers leave. ">
<meta property="og:image" content="/cover.png">
</head><body></body></html>`;

const BARE_PAGE = '<!doctype html><html><head></head><body>Nothing here</body></html>';

const link = (url: string) => `---\ntype: link\nx: 0\ny: 0\nw: 320\nh: 140\nurl: ${url}\n---\n`;

describe('link previews', () => {
  let site: Server;
  let base: string;
  let hostRoot: string;
  let store: BoardStore;
  let previews: LinkPreviews;
  /** Responses held back by the `/slow` page until a test releases them. */
  let held: ServerResponse[];

  const itemFile = (id: string) => join(hostRoot, '.post-lab/items', `${id}.md`);

  async function start(files: Record<string, string>) {
    held = [];
    const port = await freePort();
    base = `http://127.0.0.1:${String(port)}`;
    site = createServer((req, res) => {
      res.setHeader('content-type', 'text/html');
      if (req.url === '/article') res.end(OG_PAGE);
      else if (req.url === '/bare') res.end(BARE_PAGE);
      else if (req.url === '/slow') held.push(res);
      else res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => site.listen(port, '127.0.0.1', resolve));
    const withBase = Object.fromEntries(
      Object.entries(files).map(([path, text]) => [path, text.replaceAll('BASE', base)]),
    );
    hostRoot = await makeHost(withBase);
    store = await openBoardStore(hostRoot);
    previews = createLinkPreviews(store);
  }

  afterEach(async () => {
    await previews.close();
    await store.close();
    site.closeAllConnections();
    await new Promise((resolve) => site.close(resolve));
  });

  it('writes the preview of a link on the board into its file, once', async () => {
    await start({ '.post-lab/items/l1nk0001.md': link('BASE/article') });
    const expected = link(`${base}/article`).replace(
      '\n---\n',
      `\npreview:\n  title: Churn, explained\n  description: Why customers leave.\n  image: ${base}/cover.png\n---\n`,
    );
    await vi.waitFor(async () => {
      expect(await readFile(itemFile('l1nk0001'), 'utf8')).toBe(expected);
    }, 3000);
    expect(store.board().items[0]).toMatchObject({
      preview: { title: 'Churn, explained', image: `${base}/cover.png` },
    });
  });

  it('writes an empty preview for a page without Open Graph data', async () => {
    await start({ '.post-lab/items/l1nk0001.md': link('BASE/bare') });
    await vi.waitFor(async () => {
      expect(await readFile(itemFile('l1nk0001'), 'utf8')).toContain('preview: {}\n');
    }, 3000);
  });

  it('previews a link added on disk later', async () => {
    await start({ '.post-lab/items/.keep': '' });
    await writeFile(itemFile('l1nk0002'), link(`${base}/article`));
    await vi.waitFor(async () => {
      expect(await readFile(itemFile('l1nk0002'), 'utf8')).toContain('title: Churn, explained');
    }, 3000);
  });

  it('writes nothing when the page cannot be fetched', async () => {
    await start({ '.post-lab/items/l1nk0001.md': link('BASE/missing') });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await readFile(itemFile('l1nk0001'), 'utf8')).toBe(link(`${base}/missing`));
  });

  it('keeps an edit made while the page was being fetched', async () => {
    await start({ '.post-lab/items/l1nk0001.md': link('BASE/slow') });
    await vi.waitFor(() => {
      expect(held).toHaveLength(1);
    }, 3000);
    await store.putItem(
      'l1nk0001',
      { type: 'link', x: 50, y: 60, w: 320, h: 140, url: `${base}/slow` },
      'Moved\n',
    );
    held[0]?.end(OG_PAGE);
    await vi.waitFor(async () => {
      const text = await readFile(itemFile('l1nk0001'), 'utf8');
      expect(text).toContain('title: Churn, explained');
      expect(text).toContain('x: 50\ny: 60\n');
      expect(text.endsWith('---\nMoved\n')).toBe(true);
    }, 3000);
  });
});
