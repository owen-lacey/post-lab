import Papa from 'papaparse';

export type Row = Record<string, string>;

export interface Rows {
  columns: string[];
  rows: Row[];
}

export type RowsResult = { ok: true; value: Rows } | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Cell text: strings as they are, other JSON values as JSON, missing values and null empty. */
function cellText(value: unknown): string {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function toRows(records: Record<string, unknown>[], columns: string[]): Rows {
  return {
    columns,
    rows: records.map((record) =>
      Object.fromEntries(columns.map((column) => [column, cellText(record[column])])),
    ),
  };
}

/** A `.json` output as a table: it must be an array of objects. Columns in first-seen order. */
export function jsonRows(text: string): RowsResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { ok: false, message: `Not valid JSON: ${(error as Error).message}` };
  }
  if (!Array.isArray(value) || !value.every(isRecord)) {
    return {
      ok: false,
      message: 'A .json output shows as a table, so it must be an array of objects.',
    };
  }
  return { ok: true, value: toRows(value, [...new Set(value.flatMap(Object.keys))]) };
}

/** A `.csv` output as a table, with the first line as the header. */
export function csvRows(text: string): RowsResult {
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  const [error] = parsed.errors;
  if (error !== undefined) {
    const row = error.row === undefined ? '' : ` (row ${String(error.row + 1)})`;
    return { ok: false, message: `Not valid CSV: ${error.message}${row}` };
  }
  return { ok: true, value: toRows(parsed.data, parsed.meta.fields ?? []) };
}
