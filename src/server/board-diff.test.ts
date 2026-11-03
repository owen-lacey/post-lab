import { describe, expect, it } from 'vitest';
import type { Board } from '../shared/board';
import type { Item } from '../shared/schemas';
import { diffBoards } from './board-diff';

const note = (id: string, body = ''): Item => ({
  type: 'note',
  x: 0,
  y: 0,
  w: 10,
  h: 10,
  id,
  body,
});

const board = (overrides: Partial<Board> = {}): Board => ({
  items: [],
  strokes: { strokes: [] },
  problems: [],
  outputs: {},
  ...overrides,
});

describe('diffBoards', () => {
  it('finds nothing between equal boards', () => {
    const a = board({
      items: [note('aaaa0001', 'hi')],
      outputs: { c: [{ name: 'a', version: 1 }] },
    });
    expect(diffBoards(a, structuredClone(a))).toEqual([]);
  });

  it('reports added, changed and removed items', () => {
    const prev = board({ items: [note('aaaa0001'), note('aaaa0002')] });
    const next = board({ items: [note('aaaa0001', 'changed'), note('aaaa0003')] });
    expect(diffBoards(prev, next)).toEqual([
      { type: 'item-removed', id: 'aaaa0002' },
      { type: 'item', item: note('aaaa0001', 'changed') },
      { type: 'item', item: note('aaaa0003') },
    ]);
  });

  it('reports output listings that changed, including a cell losing all of its outputs', () => {
    const prev = board({
      outputs: { a: [{ name: 'x', version: 1 }], b: [{ name: 'y', version: 1 }] },
    });
    const next = board({ outputs: { a: [{ name: 'x', version: 2 }] } });
    expect(diffBoards(prev, next)).toEqual([
      { type: 'outputs', cellId: 'a', files: [{ name: 'x', version: 2 }] },
      { type: 'outputs', cellId: 'b', files: [] },
    ]);
  });

  it('reports strokes and problems as wholes', () => {
    const strokes = {
      strokes: [{ id: 'aaaa0001', color: 'red' as const, size: 's' as const, points: [] }],
    };
    const problems = [{ path: '.post-lab/items/x.md', message: 'bad' }];
    expect(diffBoards(board(), board({ strokes, problems }))).toEqual([
      { type: 'strokes', strokes },
      { type: 'problems', problems },
    ]);
  });
});
