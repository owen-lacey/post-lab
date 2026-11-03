import { describe, expect, it } from 'vitest';
import { decodeItem, parseItemFile, serializeItemFile } from './item-file';

/** One canonical file per item type, as post-lab writes them. */
const CANONICAL: Record<string, string> = {
  note: '---\ntype: note\nx: 10\ny: -20\nw: 200\nh: 160\nz: 2\nframe: f0000001\ncolor: pink\nsize: l\nalign: center\n---\nShip it?\n',
  text: '---\ntype: text\nx: 0\ny: 0\nw: 400\nh: 60\n---\nA heading\n',
  shape:
    '---\ntype: shape\nx: 5\ny: 5\nw: 120\nh: 120\nshape: diamond\ncolor: green\n---\nDecide\n',
  frame: '---\ntype: frame\nx: 0\ny: 0\nw: 800\nh: 600\ncolor: blue\n---\nAct one\n',
  image: '---\ntype: image\nx: 0\ny: 0\nw: 320\nh: 240\nsrc: assets/cover.png\n---\n',
  link: '---\ntype: link\nx: 0\ny: 0\nw: 320\nh: 200\nurl: https://example.com/post\npreview:\n  title: Example\n  description: A page\n  image: https://example.com/og.png\n---\nRead later\n',
  cell: '---\ntype: cell\nx: 120\ny: 340\nw: 480\nh: 360\ncommand: uv run analysis/churn.py | tee log.txt\ncwd: analysis\n---\nMonthly churn by cohort.\n',
  connector: '---\ntype: connector\nfrom: abc12345\nto: def67890\n---\nleads to\n',
};

function roundTrip(text: string): string {
  const decoded = decodeItem(text);
  if (!decoded.ok) throw new Error(decoded.message);
  return serializeItemFile(decoded.frontmatter, decoded.body);
}

function problem(text: string): string {
  const decoded = decodeItem(text);
  if (decoded.ok) throw new Error('expected an invalid item');
  return decoded.message;
}

describe('item files', () => {
  it.each(Object.entries(CANONICAL))('round-trips a %s byte for byte', (_type, text) => {
    expect(roundTrip(text)).toBe(text);
  });

  it('round-trips an empty body as nothing after the closing fence', () => {
    const text = '---\ntype: note\nx: 0\ny: 0\nw: 100\nh: 100\n---\n';
    expect(parseItemFile(text).body).toBe('');
    expect(roundTrip(text)).toBe(text);
  });

  it('keeps a body without a trailing newline', () => {
    const text = '---\ntype: note\nx: 0\ny: 0\nw: 100\nh: 100\n---\nno newline';
    expect(roundTrip(text)).toBe(text);
  });

  it('keeps a multi-line body that contains a fence', () => {
    const text = '---\ntype: note\nx: 0\ny: 0\nw: 100\nh: 100\n---\nfirst\n---\nsecond\n\n';
    expect(parseItemFile(text).body).toBe('first\n---\nsecond\n\n');
    expect(roundTrip(text)).toBe(text);
  });

  it('writes keys in schema order whatever order they were read in', () => {
    const text = '---\ncolor: red\nh: 100\ntype: note\nw: 100\ny: 0\nx: 0\n---\nhi\n';
    expect(roundTrip(text)).toBe(
      '---\ntype: note\nx: 0\ny: 0\nw: 100\nh: 100\ncolor: red\n---\nhi\n',
    );
  });

  it('reads YAML 1.2 core, so no and dates stay strings', () => {
    const text = '---\ntype: cell\nx: 0\ny: 0\nw: 100\nh: 100\ncommand: no\ncwd: 2024-01-01\n---\n';
    const decoded = decodeItem(text);
    expect(decoded).toMatchObject({ ok: true, frontmatter: { command: 'no', cwd: '2024-01-01' } });
    expect(roundTrip(text)).toBe(text);
  });

  it('rejects an unknown key', () => {
    expect(problem('---\ntype: note\nx: 0\ny: 0\nw: 100\nh: 100\nmood: happy\n---\n')).toContain(
      'mood',
    );
  });

  it('rejects a non-integer position', () => {
    expect(problem('---\ntype: note\nx: 1.5\ny: 0\nw: 100\nh: 100\n---\n')).toContain('x');
  });

  it('rejects a frame inside a frame', () => {
    expect(
      problem('---\ntype: frame\nx: 0\ny: 0\nw: 100\nh: 100\nframe: abc12345\n---\n'),
    ).toContain('frame');
  });

  it('rejects an unknown type', () => {
    expect(problem('---\ntype: sticker\nx: 0\ny: 0\nw: 100\nh: 100\n---\n')).toContain('type');
  });

  it('rejects an image outside assets/', () => {
    expect(
      problem('---\ntype: image\nx: 0\ny: 0\nw: 1\nh: 1\nsrc: assets/../items/a.md\n---\n'),
    ).toContain('assets/');
  });

  it('rejects a file without fences', () => {
    expect(problem('type: note\n')).toContain('---');
    expect(problem('---\ntype: note\n')).toContain('---');
  });

  it('rejects invalid YAML', () => {
    expect(problem('---\ntype: [note\n---\n')).not.toBe('');
  });
});
