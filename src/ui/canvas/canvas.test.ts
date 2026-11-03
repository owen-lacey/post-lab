import { describe, expect, it } from 'vitest';
import type { Item } from '../../shared/schemas';
import { mergeEdges, mergeNodes } from './merge';
import { placeDropped } from './placement';
import { toFlow, type ItemNode, type PositionedItem } from './to-flow';

const note = (id: string, extra: Partial<PositionedItem> = {}) =>
  ({ type: 'note', x: 0, y: 0, w: 100, h: 50, id, body: '', ...extra }) as PositionedItem;

describe('placeDropped', () => {
  const frames = [
    { id: 'frame001', x: 100, y: 100, w: 400, h: 300 },
    { id: 'frame002', x: 300, y: 100, w: 400, h: 300 },
  ];

  it('puts an item whose centre is in a frame inside it, relative to the frame', () => {
    expect(placeDropped(note('n1'), { x: 120.4, y: 130.6, w: 100, h: 50 }, frames)).toMatchObject({
      x: 20,
      y: 31,
      frame: 'frame001',
    });
  });

  it('picks the topmost of overlapping frames', () => {
    expect(placeDropped(note('n1'), { x: 350, y: 150, w: 100, h: 50 }, frames)).toMatchObject({
      x: 50,
      y: 50,
      frame: 'frame002',
    });
  });

  it('takes an item out of its frame when its centre leaves it', () => {
    const placed = placeDropped(
      note('n1', { frame: 'frame001' }),
      { x: 900, y: 10, w: 100, h: 50 },
      frames,
    );
    expect(placed).toMatchObject({ x: 900, y: 10, frame: undefined });
  });

  it('never puts a frame in a frame', () => {
    const frame: PositionedItem = {
      type: 'frame',
      x: 0,
      y: 0,
      w: 50,
      h: 50,
      id: 'frame003',
      body: '',
    };
    expect(placeDropped(frame, { x: 200.2, y: 200, w: 50, h: 50 }, frames)).toEqual({
      ...frame,
      x: 200,
      y: 200,
    });
  });
});

describe('mergeNodes', () => {
  const items: Item[] = [note('aaaa0001'), note('aaaa0002')];
  const [first, second] = toFlow(items, []).nodes as [ItemNode, ItemNode];

  it('keeps the on-screen node of an unchanged item', () => {
    const selected = { ...first, selected: true };
    const [kept] = mergeNodes(toFlow(items, []).nodes, [selected, second]);
    expect(kept).toBe(selected);
  });

  it('takes a changed item’s new values but keeps its selection', () => {
    const moved = toFlow([note('aaaa0001', { x: 70 }), items[1] as Item], []).nodes;
    const [merged] = mergeNodes(moved, [{ ...first, selected: true }, second]);
    expect(merged).toMatchObject({ position: { x: 70, y: 0 }, selected: true });
  });

  it('keeps the position of a node being dragged', () => {
    const moved = toFlow([note('aaaa0001', { x: 70 }), items[1] as Item], []).nodes;
    const dragging = { ...first, position: { x: 5, y: 6 }, dragging: true };
    const [merged] = mergeNodes(moved, [dragging, second]);
    expect(merged).toMatchObject({ position: { x: 5, y: 6 }, dragging: true });
  });

  it('selects only a newly created item', () => {
    const merged = mergeNodes(toFlow(items, []).nodes, [{ ...first, selected: true }], 'aaaa0002');
    expect(merged.map((node) => node.selected)).toEqual([false, true]);
  });
});

describe('mergeEdges', () => {
  it('keeps the edge of an unchanged connector and the selection of a changed one', () => {
    const connector: Item = { type: 'connector', from: 'a', to: 'b', id: 'conn0001', body: '' };
    const [edge] = toFlow([connector], []).edges;
    if (edge === undefined) throw new Error('no edge');
    const selected = { ...edge, selected: true };
    expect(mergeEdges(toFlow([connector], []).edges, [selected])[0]).toBe(selected);
    const relabelled = toFlow([{ ...connector, body: 'label' }], []).edges;
    expect(mergeEdges(relabelled, [selected])[0]).toMatchObject({ selected: true });
  });
});
