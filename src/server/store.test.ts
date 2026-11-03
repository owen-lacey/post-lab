import { mkdir, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardEvent } from '../shared/board';
import { openBoardStore, type BoardStore } from './store';
import { makeHost } from './test-helpers';

const FRAME = '---\ntype: frame\nx: 0\ny: 0\nw: 400\nh: 300\n---\nAct 1\n';
const CHILD = '---\ntype: note\nx: 10\ny: 20\nw: 100\nh: 80\nframe: fr4me001\n---\nInside\n';
const CELL = '---\ntype: cell\nx: 0\ny: 400\nw: 300\nh: 200\ncommand: "true"\n---\n';

/** Long enough for the watcher to notice and the store to flush; well under the 1 s target. */
const SETTLE_MS = 400;

describe('board store', () => {
  let hostRoot: string;
  let store: BoardStore;
  let events: BoardEvent[];

  const path = (relative: string) => join(hostRoot, '.post-lab', relative);
  const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  const waitForEvents = (expected: BoardEvent[]) =>
    vi.waitFor(() => {
      expect(events).toEqual(expected);
    }, 1000);

  beforeEach(async () => {
    hostRoot = await realpath(
      await makeHost({
        '.post-lab/items/fr4me001.md': FRAME,
        '.post-lab/items/n0te0001.md': CHILD,
        '.post-lab/items/c3ll0001.md': CELL,
      }),
    );
    store = await openBoardStore(hostRoot);
    events = [];
    store.subscribe((event) => events.push(event));
  });

  afterEach(async () => {
    await store.close();
  });

  it('loads the board at start', () => {
    expect(store.board().items.map((item) => item.id)).toEqual([
      'c3ll0001',
      'fr4me001',
      'n0te0001',
    ]);
  });

  it('sends an item written by hand', async () => {
    await writeFile(
      path('items/t3xt0001.md'),
      '---\ntype: text\nx: 1\ny: 2\nw: 3\nh: 4\n---\nNew\n',
    );
    await waitForEvents([
      {
        type: 'item',
        item: { type: 'text', x: 1, y: 2, w: 3, h: 4, id: 't3xt0001', body: 'New\n' },
      },
    ]);
    expect(store.board().items.map((item) => item.id)).toContain('t3xt0001');
  });

  it('sends an edited item', async () => {
    await writeFile(path('items/fr4me001.md'), FRAME.replace('Act 1', 'Act one'));
    await waitForEvents([
      {
        type: 'item',
        item: { type: 'frame', x: 0, y: 0, w: 400, h: 300, id: 'fr4me001', body: 'Act one\n' },
      },
    ]);
  });

  it('removes a deleted item file', async () => {
    await unlink(path('items/n0te0001.md'));
    await waitForEvents([{ type: 'item-removed', id: 'n0te0001' }]);
  });

  it('removes an item that becomes invalid and reports the problem', async () => {
    await writeFile(path('items/n0te0001.md'), '---\ntype: note\n---\n');
    await vi.waitFor(() => {
      expect(events.map((event) => event.type)).toEqual(['item-removed', 'problems']);
    }, 1000);
  });

  it('drops the children of a deleted frame and reports them', async () => {
    await unlink(path('items/fr4me001.md'));
    await vi.waitFor(() => {
      expect(events).toEqual([
        { type: 'item-removed', id: 'fr4me001' },
        { type: 'item-removed', id: 'n0te0001' },
        {
          type: 'problems',
          problems: [
            {
              path: '.post-lab/items/n0te0001.md',
              message: 'frame: no valid item has the ID fr4me001.',
            },
          ],
        },
      ]);
    }, 1000);
  });

  it('sends a cell’s new output listing', async () => {
    await mkdir(path('outputs/c3ll0001'), { recursive: true });
    await writeFile(path('outputs/c3ll0001/table.csv'), 'a\n1\n');
    await vi.waitFor(() => {
      expect(events).toMatchObject([
        { type: 'outputs', cellId: 'c3ll0001', files: [{ name: 'table.csv' }] },
      ]);
    }, 1000);
  });

  it('sends changed strokes', async () => {
    const strokes = {
      strokes: [{ id: 'str0k001', color: 'red', size: 's', points: [[0, 0, 0.5]] }],
    };
    await writeFile(path('strokes.json'), JSON.stringify(strokes));
    await waitForEvents([{ type: 'strokes', strokes } as BoardEvent]);
  });

  it('ignores the guide and assets', async () => {
    await writeFile(path('README.md'), 'guide');
    await mkdir(path('assets'));
    await writeFile(path('assets/photo.png'), '');
    await settle();
    expect(events).toEqual([]);
  });

  it('writes a saved item in schema order without echoing it back', async () => {
    await store.putItem(
      'fr4me001',
      { type: 'frame', color: 'red', w: 500, h: 300, x: 5, y: 0 },
      'Act 1\n',
    );
    expect(await readFile(path('items/fr4me001.md'), 'utf8')).toBe(
      '---\ntype: frame\nx: 5\ny: 0\nw: 500\nh: 300\ncolor: red\n---\nAct 1\n',
    );
    expect(store.board().items.find((item) => item.id === 'fr4me001')).toMatchObject({
      x: 5,
      color: 'red',
    });
    await settle();
    expect(events).toEqual([]);
  });

  it('amends an item as it is now, writes it and tells subscribers', async () => {
    await store.putItem(
      'c3ll0001',
      { type: 'cell', x: 7, y: 400, w: 300, h: 200, command: 'true' },
      '',
    );
    await store.amendItem('c3ll0001', (item) => ({ ...item, body: 'Amended\n' }));
    const amended = {
      type: 'cell',
      x: 7,
      y: 400,
      w: 300,
      h: 200,
      command: 'true',
      id: 'c3ll0001',
      body: 'Amended\n',
    };
    expect(events).toEqual([{ type: 'item', item: amended }]);
    expect(await readFile(path('items/c3ll0001.md'), 'utf8')).toBe(
      CELL.replace('x: 0', 'x: 7') + 'Amended\n',
    );
    await store.amendItem('c3ll0001', () => undefined);
    await store.amendItem('m1ss1ng0', (item) => item);
    await settle();
    expect(events).toHaveLength(1);
  });

  it('deletes an item file without echoing it back', async () => {
    expect(await store.deleteItem('c3ll0001')).toBe(true);
    expect(await store.deleteItem('c3ll0001')).toBe(false);
    expect(store.board().items.map((item) => item.id)).not.toContain('c3ll0001');
    await settle();
    expect(events).toEqual([]);
  });
});

describe('board store start-up', () => {
  const TEXT = '---\ntype: text\nx: 1\ny: 2\nw: 3\nh: 4\n---\n';

  // macOS FSEvents drops changes made just after a watch starts; the store must not.
  it('sees a file written as soon as it opens', async () => {
    for (let run = 0; run < 20; run++) {
      const hostRoot = await makeHost({ '.post-lab/items/aaaa0001.md': TEXT });
      const store = await openBoardStore(hostRoot);
      try {
        await writeFile(join(hostRoot, '.post-lab/items/aaaa0002.md'), TEXT);
        await vi.waitFor(() => {
          expect(store.board().items).toHaveLength(2);
        }, 1000);
        await expect(readFile(join(hostRoot, '.post-lab/.watch-check'))).rejects.toThrow();
      } finally {
        await store.close();
      }
    }
  }, 30_000);
});
