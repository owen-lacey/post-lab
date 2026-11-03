import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { decodeItem, serializeItemFile } from '../shared/item-file';
import { loadBoard } from './board';
import { makeHost } from './test-helpers';

const note = (extra = '') => `---\ntype: note\nx: 0\ny: 0\nw: 100\nh: 100\n${extra}---\nhi\n`;
const frame = '---\ntype: frame\nx: 0\ny: 0\nw: 400\nh: 400\n---\nAct one\n';
const connector = (from: string, to: string) =>
  `---\ntype: connector\nfrom: ${from}\nto: ${to}\n---\n`;

async function board(files: Record<string, string>) {
  return loadBoard(await makeHost(files));
}

describe('loadBoard', () => {
  it('loads items with their ID and body, and no strokes when strokes.json is missing', async () => {
    const result = await board({
      '.post-lab/items/aaaa0001.md': frame,
      '.post-lab/items/aaaa0002.md': note('frame: aaaa0001\n'),
      '.post-lab/items/aaaa0003.md': note(),
      '.post-lab/items/aaaa0004.md': connector('aaaa0002', 'aaaa0003'),
    });
    expect(result.problems).toEqual([]);
    expect(result.strokes).toEqual({ strokes: [] });
    expect(result.items.map((item) => item.id)).toEqual([
      'aaaa0001',
      'aaaa0002',
      'aaaa0003',
      'aaaa0004',
    ]);
    expect(result.items[1]).toMatchObject({ type: 'note', frame: 'aaaa0001', body: 'hi\n' });
  });

  it('treats a board without items/ as empty', async () => {
    expect(await board({ '.post-lab/README.md': '' })).toEqual({
      items: [],
      strokes: { strokes: [] },
      problems: [],
      outputs: {},
    });
  });

  it('reports an invalid item file and still loads the rest', async () => {
    const result = await board({
      '.post-lab/items/aaaa0001.md': note('mood: happy\n'),
      '.post-lab/items/aaaa0002.md': note(),
    });
    expect(result.items.map((item) => item.id)).toEqual(['aaaa0002']);
    expect(result.problems).toEqual([
      { path: '.post-lab/items/aaaa0001.md', message: expect.stringContaining('mood') as string },
    ]);
  });

  it('reports files that are not named <id>.md', async () => {
    const result = await board({
      '.post-lab/items/Note.md': note(),
      '.post-lab/items/aaaa0001.txt': note(),
      '.post-lab/items/aaaa0002.md/inner.md': note(),
    });
    expect(result.items).toEqual([]);
    expect(result.problems.map((problem) => problem.path)).toEqual([
      '.post-lab/items/Note.md',
      '.post-lab/items/aaaa0001.txt',
      '.post-lab/items/aaaa0002.md',
    ]);
  });

  it('reports items in a missing frame or in an item that is not a frame', async () => {
    const result = await board({
      '.post-lab/items/aaaa0001.md': note('frame: zzzz9999\n'),
      '.post-lab/items/aaaa0002.md': note('frame: aaaa0003\n'),
      '.post-lab/items/aaaa0003.md': note(),
    });
    expect(result.items.map((item) => item.id)).toEqual(['aaaa0003']);
    expect(result.problems).toEqual([
      { path: '.post-lab/items/aaaa0001.md', message: 'frame: no valid item has the ID zzzz9999.' },
      { path: '.post-lab/items/aaaa0002.md', message: 'frame: aaaa0003 is a note, not a frame.' },
    ]);
  });

  it('reports items in a frame whose file is invalid', async () => {
    const result = await board({
      '.post-lab/items/aaaa0001.md': frame.replace('h: 400', 'h: 0'),
      '.post-lab/items/aaaa0002.md': note('frame: aaaa0001\n'),
    });
    expect(result.items).toEqual([]);
    expect(result.problems.map((problem) => problem.path)).toEqual([
      '.post-lab/items/aaaa0001.md',
      '.post-lab/items/aaaa0002.md',
    ]);
  });

  it('reports connectors to missing items, connectors, or items dropped for problems', async () => {
    const result = await board({
      '.post-lab/items/aaaa0001.md': note(),
      '.post-lab/items/aaaa0002.md': connector('aaaa0001', 'zzzz9999'),
      '.post-lab/items/aaaa0003.md': connector('aaaa0002', 'aaaa0001'),
      '.post-lab/items/aaaa0004.md': note('frame: zzzz9999\n'),
      '.post-lab/items/aaaa0005.md': connector('aaaa0001', 'aaaa0004'),
    });
    expect(result.items.map((item) => item.id)).toEqual(['aaaa0001']);
    expect(result.problems).toEqual([
      { path: '.post-lab/items/aaaa0002.md', message: 'to: no valid item has the ID zzzz9999.' },
      {
        path: '.post-lab/items/aaaa0003.md',
        message: 'from: aaaa0002 is a connector; connect items instead.',
      },
      { path: '.post-lab/items/aaaa0004.md', message: 'frame: no valid item has the ID zzzz9999.' },
      { path: '.post-lab/items/aaaa0005.md', message: 'to: no valid item has the ID aaaa0004.' },
    ]);
  });

  it('loads valid strokes and reports invalid ones', async () => {
    const stroke = { id: 'aaaa0001', color: 'red', size: 's', points: [[0, 0, 0.5]] };
    const valid = await board({
      '.post-lab/strokes.json': JSON.stringify({ strokes: [stroke] }),
    });
    expect(valid).toMatchObject({ strokes: { strokes: [stroke] }, problems: [] });

    const badJson = await board({ '.post-lab/strokes.json': '{' });
    const badShape = await board({ '.post-lab/strokes.json': '{"strokes": [{"id": 1}]}' });
    for (const result of [badJson, badShape]) {
      expect(result.strokes).toEqual({ strokes: [] });
      expect(result.problems.map((problem) => problem.path)).toEqual(['.post-lab/strokes.json']);
    }
  });
});

describe('demo board', () => {
  const demo = fileURLToPath(new URL('../../examples/demo', import.meta.url));

  it('loads every item type, with only the two deliberately invalid files as problems', async () => {
    const result = await loadBoard(demo);
    expect(new Set(result.items.map((item) => item.type))).toEqual(
      new Set(['note', 'text', 'shape', 'frame', 'image', 'link', 'cell', 'connector']),
    );
    expect(result.problems.map((problem) => problem.path)).toEqual([
      '.post-lab/items/bad00001.md',
      '.post-lab/items/bad00002.md',
    ]);
    expect(result.strokes.strokes).toHaveLength(1);
  });

  it('is written in canonical form', async () => {
    const dir = join(demo, '.post-lab/items');
    for (const name of await readdir(dir)) {
      const text = await readFile(join(dir, name), 'utf8');
      const decoded = decodeItem(text);
      if (decoded.ok) expect(serializeItemFile(decoded.frontmatter, decoded.body)).toBe(text);
    }
  });
});
