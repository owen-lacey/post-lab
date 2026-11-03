import type { Board, BoardEvent, OutputFile } from '../shared/board';
import type { Item } from '../shared/schemas';

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function itemEvents(prev: Item[], next: Item[]): BoardEvent[] {
  const before = new Map(prev.map((item) => [item.id, item]));
  const after = new Set(next.map((item) => item.id));
  const changed: BoardEvent[] = next
    .filter((item) => !same(before.get(item.id), item))
    .map((item) => ({ type: 'item', item }));
  const removed: BoardEvent[] = prev
    .filter((item) => !after.has(item.id))
    .map((item) => ({ type: 'item-removed', id: item.id }));
  return [...removed, ...changed];
}

function outputEvents(
  prev: Record<string, OutputFile[]>,
  next: Record<string, OutputFile[]>,
): BoardEvent[] {
  const cellIds = new Set([...Object.keys(prev), ...Object.keys(next)]);
  return [...cellIds]
    .filter((cellId) => !same(prev[cellId], next[cellId]))
    .map((cellId) => ({ type: 'outputs', cellId, files: next[cellId] ?? [] }));
}

/** The events that turn a UI showing `prev` into one showing `next`. */
export function diffBoards(prev: Board, next: Board): BoardEvent[] {
  const events = [
    ...itemEvents(prev.items, next.items),
    ...outputEvents(prev.outputs, next.outputs),
  ];
  if (!same(prev.strokes, next.strokes)) events.push({ type: 'strokes', strokes: next.strokes });
  if (!same(prev.problems, next.problems)) {
    events.push({ type: 'problems', problems: next.problems });
  }
  return events;
}
