import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { BOARD_DIR, type Board, type Problem } from '../shared/board';
import { decodeItem } from '../shared/item-file';
import { ID_PATTERN, strokesSchema, type Item, type Strokes } from '../shared/schemas';

const ITEM_FILE_NAME = /^([0-9a-z]{8})\.md$/;

interface Loaded<T> {
  value: T;
  problems: Problem[];
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/** Code-point order, so listings are the same on every machine and locale. */
function compare(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function itemPath(name: string): string {
  return `${BOARD_DIR}/items/${name}`;
}

/** Lists `items/`. A missing folder is an empty board: git does not keep empty folders. */
async function listItemFiles(boardDir: string) {
  try {
    const entries = await readdir(join(boardDir, 'items'), { withFileTypes: true });
    return entries.sort((a, b) => compare(a.name, b.name));
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
}

async function readItems(boardDir: string): Promise<Loaded<Item[]>> {
  const items: Item[] = [];
  const problems: Problem[] = [];
  for (const entry of await listItemFiles(boardDir)) {
    const id = ITEM_FILE_NAME.exec(entry.name)?.[1];
    if (id === undefined || !entry.isFile()) {
      problems.push({
        path: itemPath(entry.name),
        message: `Item files are named <id>.md, where the ID matches ${ID_PATTERN.source}.`,
      });
      continue;
    }
    const decoded = decodeItem(await readFile(join(boardDir, 'items', entry.name), 'utf8'));
    if (decoded.ok) items.push({ ...decoded.frontmatter, id, body: decoded.body });
    else problems.push({ path: itemPath(entry.name), message: decoded.message });
  }
  return { value: items, problems };
}

function frameProblem(item: Item, byId: Map<string, Item>): string | undefined {
  if (item.type === 'connector' || item.type === 'frame' || item.frame === undefined) {
    return undefined;
  }
  const frame = byId.get(item.frame);
  if (frame === undefined) return `frame: no valid item has the ID ${item.frame}.`;
  if (frame.type !== 'frame') return `frame: ${item.frame} is a ${frame.type}, not a frame.`;
  return undefined;
}

function endpointProblem(key: 'from' | 'to', id: string, byId: Map<string, Item>) {
  const target = byId.get(id);
  if (target === undefined) return `${key}: no valid item has the ID ${id}.`;
  if (target.type === 'connector') return `${key}: ${id} is a connector; connect items instead.`;
  return undefined;
}

function connectorProblem(item: Item, byId: Map<string, Item>): string | undefined {
  if (item.type !== 'connector') return undefined;
  return endpointProblem('from', item.from, byId) ?? endpointProblem('to', item.to, byId);
}

/** Drops items whose check finds a problem, reporting each one. */
function keepValid(
  items: Item[],
  check: (item: Item, byId: Map<string, Item>) => string | undefined,
): Loaded<Item[]> {
  const byId = new Map(items.map((item) => [item.id, item]));
  const kept: Item[] = [];
  const problems: Problem[] = [];
  for (const item of items) {
    const message = check(item, byId);
    if (message === undefined) kept.push(item);
    else problems.push({ path: itemPath(`${item.id}.md`), message });
  }
  return { value: kept, problems };
}

/** Items must reference frames and connector endpoints that are on the board and valid. */
function checkReferences(items: Item[]): Loaded<Item[]> {
  const framed = keepValid(items, frameProblem);
  const connected = keepValid(framed.value, connectorProblem);
  return { value: connected.value, problems: [...framed.problems, ...connected.problems] };
}

/** `strokes.json` is optional: a board without one has no strokes. */
async function readStrokes(boardDir: string): Promise<Loaded<Strokes>> {
  const empty = { strokes: [] };
  let text: string;
  try {
    text = await readFile(join(boardDir, 'strokes.json'), 'utf8');
  } catch (error) {
    if (isMissing(error)) return { value: empty, problems: [] };
    throw error;
  }
  const path = `${BOARD_DIR}/strokes.json`;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { value: empty, problems: [{ path, message: (error as Error).message }] };
  }
  const result = strokesSchema.safeParse(json);
  if (result.success) return { value: result.data, problems: [] };
  return { value: empty, problems: [{ path, message: z.prettifyError(result.error) }] };
}

/** Reads the whole board from disk. Invalid files are left out and listed as problems. */
export async function loadBoard(hostRoot: string): Promise<Board> {
  const boardDir = join(hostRoot, BOARD_DIR);
  const read = await readItems(boardDir);
  const checked = checkReferences(read.value);
  const strokes = await readStrokes(boardDir);
  const problems = [...read.problems, ...checked.problems, ...strokes.problems];
  problems.sort((a, b) => compare(a.path, b.path));
  return { items: checked.value, strokes: strokes.value, problems };
}
