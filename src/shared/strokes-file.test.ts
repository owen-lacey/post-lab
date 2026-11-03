import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { strokesSchema } from './schemas';
import { serializeStrokes } from './strokes-file';

const DEMO = new URL('../../examples/demo/.post-lab/strokes.json', import.meta.url);

describe('strokes file', () => {
  it('round-trips the demo file byte for byte', async () => {
    const text = await readFile(DEMO, 'utf8');
    expect(serializeStrokes(strokesSchema.parse(JSON.parse(text)))).toBe(text);
  });

  it('writes an empty drawing', () => {
    expect(serializeStrokes({ strokes: [] })).toBe('{\n  "strokes": []\n}\n');
  });

  it('rounds positions to a tenth and pressure to a hundredth', () => {
    const text = serializeStrokes({
      strokes: [{ id: 'abcd1234', color: 'blue', size: 's', points: [[1.234, -5.678, 0.4567]] }],
    });
    expect(JSON.parse(text)).toEqual({
      strokes: [{ id: 'abcd1234', color: 'blue', size: 's', points: [[1.2, -5.7, 0.46]] }],
    });
  });
});
