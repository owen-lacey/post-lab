import { BOARD_DIR, type Board } from '../shared/board';
import { serializeItemFile } from '../shared/item-file';
import type { Item, Strokes } from '../shared/schemas';
import { serializeStrokes } from '../shared/strokes-file';

/** One user action on the canvas: items written, item files deleted, the drawing replaced. */
export interface BoardEdit {
  saved?: Item[];
  deleted?: string[];
  strokes?: Strokes;
}

/** An item's state before and after a step; absent means the item did not exist. */
export interface ItemChange {
  id: string;
  before: Item | undefined;
  after: Item | undefined;
}

/** What one edit changed, so it can be undone and redone. */
export interface Step {
  items: ItemChange[];
  strokes?: { before: Strokes; after: Strokes };
}

export interface History {
  undo: Step[];
  redo: Step[];
}

export type Direction = 'undo' | 'redo';

export const HISTORY_LIMIT = 100;

export const emptyHistory: History = { undo: [], redo: [] };

/**
 * The item's file as post-lab writes it. A link's `preview` is left out: the server writes it
 * in after the link is saved, and that is not an edit that should block an undo.
 */
function fileText(item: Item | undefined): string | undefined {
  if (item === undefined) return undefined;
  const compared = item.type === 'link' ? { ...item, preview: undefined } : item;
  return serializeItemFile(compared, item.body);
}

function sameItem(a: Item | undefined, b: Item | undefined): boolean {
  return fileText(a) === fileText(b);
}

function sameStrokes(a: Strokes, b: Strokes): boolean {
  return serializeStrokes(a) === serializeStrokes(b);
}

function itemsById(board: Board): Map<string, Item> {
  return new Map(board.items.map((item) => [item.id, item]));
}

export function isEmptyStep(step: Step): boolean {
  return step.items.length === 0 && step.strokes === undefined;
}

/** What an edit changes on the board; items it leaves as they were are not part of the step. */
export function recordStep(board: Board, change: BoardEdit): Step {
  const current = itemsById(board);
  const changes = new Map<string, ItemChange>();
  const touch = (id: string, after: Item | undefined) => {
    const before = changes.has(id) ? changes.get(id)?.before : current.get(id);
    changes.set(id, { id, before, after });
  };
  for (const id of change.deleted ?? []) touch(id, undefined);
  for (const item of change.saved ?? []) touch(item.id, item);
  const items = [...changes.values()].filter((entry) => !sameItem(entry.before, entry.after));
  const strokes = change.strokes;
  if (strokes === undefined || sameStrokes(board.strokes, strokes)) return { items };
  return { items, strokes: { before: board.strokes, after: strokes } };
}

/** Adds a step for a new edit: the redo steps go, and only the last 100 steps are kept. */
export function pushStep(history: History, step: Step): History {
  if (isEmptyStep(step)) return history;
  return { undo: [...history.undo, step].slice(-HISTORY_LIMIT), redo: [] };
}

/** The step an undo or redo would revert next. */
export function nextStep(history: History, direction: Direction): Step | undefined {
  return history[direction].at(-1);
}

/** Moves the reverted step to the other stack, keeping only the part that was applied. */
export function afterRevert(history: History, direction: Direction, applied: Step): History {
  const rest = history[direction].slice(0, -1);
  const other = direction === 'undo' ? history.redo : history.undo;
  const moved = (isEmptyStep(applied) ? other : [...other, applied]).slice(-HISTORY_LIMIT);
  return direction === 'undo' ? { undo: rest, redo: moved } : { undo: moved, redo: rest };
}

/** The state a revert expects to find, and the state it writes. */
function ends<T>(change: { before: T; after: T }, direction: Direction) {
  return direction === 'undo'
    ? { expected: change.after, target: change.before }
    : { expected: change.before, target: change.after };
}

export interface Reverted {
  /** The writes that revert the step. */
  change: BoardEdit;
  /** The part of the step that was reverted. */
  applied: Step;
  /** Paths of the files left alone because they changed since the step. */
  skipped: string[];
}

function revertStrokes(board: Board, step: Step, direction: Direction) {
  if (step.strokes === undefined) return { skipped: false };
  const { expected, target } = ends(step.strokes, direction);
  if (!sameStrokes(board.strokes, expected)) return { skipped: true };
  return { skipped: false, strokes: target, applied: step.strokes };
}

/**
 * Undoes or redoes a step against the board as it is now. Last write wins (D8) is for files,
 * not for undo: a file that changed since the step (on disk, by an agent, in another tab) is left
 * as it is, and the rest of the step still applies.
 */
export function revert(board: Board, step: Step, direction: Direction): Reverted {
  const current = itemsById(board);
  const applied = step.items.filter((entry) =>
    sameItem(current.get(entry.id), ends(entry, direction).expected),
  );
  const skipped = step.items
    .filter((entry) => !applied.includes(entry))
    .map((entry) => `${BOARD_DIR}/items/${entry.id}.md`);
  const targets = applied.map((entry) => ({ id: entry.id, item: ends(entry, direction).target }));
  const saved = targets.flatMap(({ item }) => (item === undefined ? [] : [item]));
  const deleted = targets.filter(({ item }) => item === undefined).map(({ id }) => id);
  const strokes = revertStrokes(board, step, direction);
  if (strokes.skipped) skipped.push(`${BOARD_DIR}/strokes.json`);
  return {
    change: { saved, deleted, strokes: strokes.strokes },
    applied:
      strokes.applied === undefined
        ? { items: applied }
        : { items: applied, strokes: strokes.applied },
    skipped,
  };
}

/** Frames first and connectors last, so what an item names already exists when it is written. */
function rank(item: Item | undefined): number {
  if (item?.type === 'frame') return 0;
  return item?.type === 'connector' ? 2 : 1;
}

/**
 * An edit's writes in an order whose every step leaves references whole: deletes from
 * connectors to frames, then saves from frames to connectors, then the drawing.
 */
export function inWriteOrder(board: Board, change: BoardEdit): BoardEdit {
  const current = itemsById(board);
  const deleted = (change.deleted ?? []).toSorted(
    (a, b) => rank(current.get(b)) - rank(current.get(a)),
  );
  const saved = (change.saved ?? []).toSorted((a, b) => rank(a) - rank(b));
  return { saved, deleted, strokes: change.strokes };
}
