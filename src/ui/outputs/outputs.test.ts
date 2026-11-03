import { describe, expect, it } from 'vitest';
import { rendererFor } from './renderer-for';
import { csvRows, jsonRows } from './rows';

describe('rendererFor', () => {
  it.each([
    ['chart.png', 'image'],
    ['photo.JPG', 'image'],
    ['photo.jpeg', 'image'],
    ['anim.gif', 'image'],
    ['pic.webp', 'image'],
    ['logo.svg', 'image'],
    ['data.csv', 'csv'],
    ['rows.json', 'json'],
    ['chart.vl.json', 'vega-lite'],
    ['plot.html', 'html'],
    ['notes.md', 'markdown'],
    ['stdout.txt', 'stdout'],
    ['other.txt', 'link'],
    ['data.parquet', 'link'],
    ['Makefile', 'link'],
  ])('%s renders as %s', (name, kind) => {
    expect(rendererFor(name)).toBe(kind);
  });
});

describe('jsonRows', () => {
  it('makes columns from every key, in first-seen order', () => {
    expect(jsonRows('[{"a":1,"b":"x"},{"c":true,"a":null},{"b":{"n":[1]}}]')).toEqual({
      ok: true,
      value: {
        columns: ['a', 'b', 'c'],
        rows: [
          { a: '1', b: 'x', c: '' },
          { a: '', b: '', c: 'true' },
          { a: '', b: '{"n":[1]}', c: '' },
        ],
      },
    });
  });

  it('accepts an empty array', () => {
    expect(jsonRows('[]')).toEqual({ ok: true, value: { columns: [], rows: [] } });
  });

  it.each(['{"a":1}', '[[1,2]]', '[{"a":1}, 2]', '[null]', '"text"'])('rejects %s', (text) => {
    expect(jsonRows(text)).toMatchObject({ ok: false });
  });

  it('rejects invalid JSON', () => {
    expect(jsonRows('[{')).toMatchObject({ ok: false, message: /^Not valid JSON/ });
  });
});

describe('csvRows', () => {
  it('uses the header line for columns', () => {
    expect(csvRows('month,users\n2026-01,"1,200"\n2026-02,900\n')).toEqual({
      ok: true,
      value: {
        columns: ['month', 'users'],
        rows: [
          { month: '2026-01', users: '1,200' },
          { month: '2026-02', users: '900' },
        ],
      },
    });
  });

  it('keeps the columns of a header-only file', () => {
    expect(csvRows('a,b\n')).toEqual({ ok: true, value: { columns: ['a', 'b'], rows: [] } });
  });

  it('rejects rows with the wrong number of fields', () => {
    expect(csvRows('a,b\n1\n')).toMatchObject({ ok: false, message: /row 1/ });
  });
});
