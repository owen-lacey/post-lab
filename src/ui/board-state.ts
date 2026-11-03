import type { Board, BoardEvent } from '../shared/board';
import type { Item } from '../shared/schemas';

export interface SyncState {
  board: Board | undefined;
  /** Events that arrived while a board fetch was in flight, replayed once it lands. */
  pending: BoardEvent[] | undefined;
}

export type SyncAction =
  { type: 'syncing' } | { type: 'loaded'; board: Board } | { type: 'event'; event: BoardEvent };

export const initialSyncState: SyncState = { board: undefined, pending: undefined };

function withItem(items: Item[], item: Item): Item[] {
  const index = items.findIndex((existing) => existing.id === item.id);
  return index === -1 ? [...items, item] : items.with(index, item);
}

/** Applies one change to the board. Unchanged items keep their identity. */
export function applyEvent(board: Board, event: BoardEvent): Board {
  switch (event.type) {
    case 'item':
      return { ...board, items: withItem(board.items, event.item) };
    case 'item-removed':
      return { ...board, items: board.items.filter((item) => item.id !== event.id) };
    case 'strokes':
      return { ...board, strokes: event.strokes };
    case 'outputs': {
      const others = Object.entries(board.outputs).filter(([cellId]) => cellId !== event.cellId);
      const listed = event.files.length === 0 ? [] : [[event.cellId, event.files] as const];
      return { ...board, outputs: Object.fromEntries([...others, ...listed]) };
    }
    case 'problems':
      return { ...board, problems: event.problems };
  }
}

/**
 * Board state kept in step with the server: a fetched board plus the events streamed after it.
 * Local edits are applied as events too, so they are buffered the same way during a fetch.
 */
export function reduceSync(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case 'syncing':
      return { ...state, pending: [] };
    case 'loaded':
      return { board: (state.pending ?? []).reduce(applyEvent, action.board), pending: undefined };
    case 'event':
      if (state.pending !== undefined) {
        return { ...state, pending: [...state.pending, action.event] };
      }
      return { ...state, board: state.board && applyEvent(state.board, action.event) };
  }
}
