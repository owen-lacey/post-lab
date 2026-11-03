import type { XYPosition } from '@xyflow/react';
import type { Color, Size } from '../../shared/palette';
import type { Strokes } from '../../shared/schemas';
import { moveStroke } from './stroke-path';

/** The drawing with each dragged stroke moved to where its node landed. */
export function moveStrokes(drawing: Strokes, landed: Map<string, XYPosition>): Strokes {
  return {
    strokes: drawing.strokes.map((stroke) => {
      const to = landed.get(stroke.id);
      return to === undefined ? stroke : moveStroke(stroke, to);
    }),
  };
}

export function withoutStrokes(drawing: Strokes, ids: Set<string>): Strokes {
  return { strokes: drawing.strokes.filter((stroke) => !ids.has(stroke.id)) };
}

export type InkToken = { color: Color } | { size: Size };

/** The drawing with a colour or size token set on the given strokes. */
export function restyleStrokes(drawing: Strokes, ids: Set<string>, token: InkToken): Strokes {
  return {
    strokes: drawing.strokes.map((stroke) =>
      ids.has(stroke.id) ? { ...stroke, ...token } : stroke,
    ),
  };
}
