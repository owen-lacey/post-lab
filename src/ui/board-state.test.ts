import { describe, expect, it } from 'vitest';
import type { Board } from '../shared/board';
import type { Item } from '../shared/schemas';
import { applyEvent, initialSyncState, reduceSync } from './board-state';

const note = (id: string, body = ''): Item => ({ type: 'note', x: 0, y: 0, w: 1, h: 1, id, body });

const board = (items: Item[] = []): Board => ({
  items,
  strokes: { strokes: [] },
  problems: [],
  outputs: {},
});

describe('applyEvent', () => {
  it('replaces a changed item in place and keeps the others', () => {
    const first = note('aaaa0001');
    const before = board([first, note('aaaa0002')]);
    const after = applyEvent(before, { type: 'item', item: note('aaaa0002', 'x') });
    expect(after.items).toEqual([first, note('aaaa0002', 'x')]);
    expect(after.items[0]).toBe(first);
  });

  it('adds new items and removes deleted ones', () => {
    const added = applyEvent(board(), { type: 'item', item: note('aaaa0001') });
    expect(added.items).toEqual([note('aaaa0001')]);
    expect(applyEvent(added, { type: 'item-removed', id: 'aaaa0001' }).items).toEqual([]);
  });

  it('sets and clears a cell’s outputs', () => {
    const files = [{ name: 'a.csv', version: 1 }];
    const set = applyEvent(board(), { type: 'outputs', cellId: 'c', files });
    expect(set.outputs).toEqual({ c: files });
    expect(applyEvent(set, { type: 'outputs', cellId: 'c', files: [] }).outputs).toEqual({});
  });

  it('replaces problems and strokes', () => {
    const problems = [{ path: 'p', message: 'm' }];
    expect(applyEvent(board(), { type: 'problems', problems }).problems).toBe(problems);
    const strokes = { strokes: [] };
    expect(applyEvent(board(), { type: 'strokes', strokes }).strokes).toBe(strokes);
  });
});

describe('reduceSync', () => {
  it('holds events back during a fetch and replays them on the fetched board', () => {
    const syncing = reduceSync(initialSyncState, { type: 'syncing' });
    const buffered = reduceSync(syncing, {
      type: 'event',
      event: { type: 'item', item: note('aaaa0002') },
    });
    expect(buffered.board).toBeUndefined();
    const loaded = reduceSync(buffered, { type: 'loaded', board: board([note('aaaa0001')]) });
    expect(loaded).toEqual({
      board: board([note('aaaa0001'), note('aaaa0002')]),
      pending: undefined,
    });
  });

  it('applies events straight away once loaded', () => {
    const loaded = reduceSync(initialSyncState, { type: 'loaded', board: board() });
    const next = reduceSync(loaded, {
      type: 'event',
      event: { type: 'item', item: note('aaaa0001') },
    });
    expect(next.board?.items).toEqual([note('aaaa0001')]);
  });
});
