import type { XYPosition } from '@xyflow/react';
import { getStroke } from 'perfect-freehand';
import type { Size } from '../../shared/palette';
import { roundPoint, type Stroke, type StrokePoint } from '../../shared/strokes-file';
import type { Box } from './placement';

/** Pen width in board units for each size token. */
export const STROKE_WIDTHS: Record<Size, number> = { s: 4, m: 8, l: 16 };

/**
 * The SVG path of a stroke's outline, in the points' own coordinates. Pressure comes from the
 * points (a mouse reports a steady 0.5, a pen its real pressure), so lines are not thinned by
 * speed.
 */
export function outlinePath(points: StrokePoint[], size: Size): string {
  const outline = getStroke(points, { size: STROKE_WIDTHS[size], simulatePressure: false }).map(
    ([x, y]): XYPosition => ({ x, y }),
  );
  const last = outline.at(-1);
  if (last === undefined) return '';
  // Smooth curves: each outline point is the control point between its neighbours' midpoints.
  const midpoint = (a: XYPosition, b: XYPosition) =>
    `${format((a.x + b.x) / 2)},${format((a.y + b.y) / 2)}`;
  const curves = outline.map((point, index) => {
    const next = outline[index + 1] ?? outline[0] ?? point;
    return `${format(point.x)},${format(point.y)} ${midpoint(point, next)}`;
  });
  return `M${midpoint(last, outline[0] ?? last)} Q${curves.join(' ')} Z`;
}

/** Two decimals are finer than a pixel at any zoom React Flow allows. */
function format(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** The box a stroke's ink fits in, padded by the pen width. */
export function strokeBounds({ points, size }: Stroke): Box {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const pad = STROKE_WIDTHS[size];
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

/** The stroke's outline relative to the top-left corner of its bounds. */
export function strokeShape(stroke: Stroke): { box: Box; path: string } {
  const box = strokeBounds(stroke);
  const points = stroke.points.map(([x, y, pressure]): StrokePoint => [
    x - box.x,
    y - box.y,
    pressure,
  ]);
  return { box, path: outlinePath(points, stroke.size) };
}

/** The stroke moved so its bounds start at `to`. */
export function moveStroke(stroke: Stroke, to: XYPosition): Stroke {
  const from = strokeBounds(stroke);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return stroke;
  return {
    ...stroke,
    points: stroke.points.map(([x, y, pressure]) => roundPoint([x + dx, y + dy, pressure])),
  };
}
