import { describe, expect, it } from 'vitest';
import type { Strokes } from '../../shared/schemas';
import type { Stroke } from '../../shared/strokes-file';
import { mergeNodes } from './merge';
import { moveStrokes, restyleStrokes, withoutStrokes } from './stroke-edits';
import { outlinePath, strokeBounds, strokeShape } from './stroke-path';
import { STROKE_Z, toFlow } from './to-flow';

const stroke: Stroke = {
  id: 'str0k001',
  color: 'red',
  size: 'm',
  points: [
    [100, 200, 0.5],
    [140, 260, 0.5],
  ],
};
const other: Stroke = { ...stroke, id: 'str0k002', color: 'blue', size: 's' };
const drawing: Strokes = { strokes: [stroke, other] };

describe('stroke geometry', () => {
  it('pads the bounds by the pen width', () => {
    expect(strokeBounds(stroke)).toEqual({ x: 92, y: 192, w: 56, h: 76 });
  });

  it('outlines a stroke as a closed path relative to its bounds', () => {
    const { box, path } = strokeShape(stroke);
    expect(box).toEqual(strokeBounds(stroke));
    expect(path).toMatch(/^M-?[\d.]+,-?[\d.]+ Q.* Z$/);
    expect(outlinePath([], 'm')).toBe('');
  });
});

describe('stroke edits', () => {
  it('moves a dragged stroke by how far its bounds moved, rounding the points', () => {
    const moved = moveStrokes(drawing, new Map([['str0k001', { x: 102.04, y: 182 }]]));
    expect(moved.strokes[0]?.points).toEqual([
      [110, 190, 0.5],
      [150, 250, 0.5],
    ]);
    expect(moved.strokes[1]).toBe(other);
  });

  it('keeps a stroke that did not move', () => {
    const { x, y } = strokeBounds(stroke);
    expect(moveStrokes(drawing, new Map([['str0k001', { x, y }]])).strokes[0]).toBe(stroke);
  });

  it('deletes and restyles only the given strokes', () => {
    expect(withoutStrokes(drawing, new Set(['str0k001']))).toEqual({ strokes: [other] });
    const restyled = restyleStrokes(drawing, new Set(['str0k002']), { size: 'l' });
    expect(restyled.strokes).toEqual([stroke, { ...other, size: 'l' }]);
  });
});

describe('strokes on the canvas', () => {
  const note = { type: 'note', x: 0, y: 0, w: 10, h: 10, z: 50, id: 'n0te0001', body: '' } as const;

  it('puts strokes after items, at their bounds and above every item', () => {
    const { nodes } = toFlow([note], drawing.strokes);
    expect(nodes.map((node) => node.id)).toEqual(['n0te0001', 'str0k001', 'str0k002']);
    expect(nodes[1]).toMatchObject({
      type: 'stroke',
      position: { x: 92, y: 192 },
      width: 56,
      height: 76,
      zIndex: STROKE_Z,
      data: { stroke },
    });
  });

  it('keeps an unchanged stroke node and the selection of a changed one', () => {
    const current = toFlow([], drawing.strokes).nodes.map((node) => ({ ...node, selected: true }));
    const next = toFlow([], [stroke, { ...other, color: 'green' }]).nodes;
    const merged = mergeNodes(next, current);
    expect(merged[0]).toBe(current[0]);
    expect(merged[1]).toMatchObject({ selected: true, data: { stroke: { color: 'green' } } });
  });
});
