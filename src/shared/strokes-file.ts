import type { Strokes } from './schemas';

export type Stroke = Strokes['strokes'][number];
export type StrokePoint = Stroke['points'][number];

const round = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** Positions to a tenth of a unit and pressure to a hundredth keep the file small. */
export function roundPoint([x, y, pressure]: StrokePoint): StrokePoint {
  return [round(x, 1), round(y, 1), round(pressure, 2)];
}

function formatPoint(point: StrokePoint): string {
  return JSON.stringify(roundPoint(point)).replaceAll(',', ', ');
}

function formatStroke({ id, color, size, points }: Stroke): string {
  const head = [`"id": ${JSON.stringify(id)}`, `"color": "${color}"`, `"size": "${size}"`];
  const pointLines = points.map((point) => `        ${formatPoint(point)}`).join(',\n');
  const pointsField = points.length === 0 ? '"points": []' : `"points": [\n${pointLines}\n      ]`;
  return `    {\n${[...head, pointsField].map((line) => `      ${line}`).join(',\n')}\n    }`;
}

/**
 * `strokes.json` as post-lab writes it: two-space JSON with one point per line, so a drawing is
 * readable and diffs stay line-sized.
 */
export function serializeStrokes({ strokes }: Strokes): string {
  if (strokes.length === 0) return '{\n  "strokes": []\n}\n';
  return `{\n  "strokes": [\n${strokes.map(formatStroke).join(',\n')}\n  ]\n}\n`;
}
