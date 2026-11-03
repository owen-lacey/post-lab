import { useCallback, useLayoutEffect, useRef } from 'react';
import { toast } from 'sonner';
import { deleteRequest, errorMessage, putJson } from '@/lib/api';
import type { Board, BoardEvent, ItemContent } from '../shared/board';
import { applyEvent } from './board-state';
import {
  afterRevert,
  emptyHistory,
  inWriteOrder,
  nextStep,
  pushStep,
  recordStep,
  revert,
  type BoardEdit,
  type Direction,
  type History,
} from './history';

export interface Editor {
  /** Shows the edit at once, then writes it to disk; one call is one undo step. */
  edit: (change: BoardEdit) => void;
  /** Reverts the last edit, leaving alone any file that changed since. */
  undo: () => void;
  /** Makes the last undone edit again, leaving alone any file that changed since. */
  redo: () => void;
}

const NOTICE: Record<Direction, string> = {
  undo: 'Some of the change was not undone',
  redo: 'Some of the change was not redone',
};

/**
 * Saves edits made on the canvas and keeps their undo history (in memory, per tab). Requests go
 * out one at a time, in order, so two quick edits to one item reach the disk in the order they
 * were made. A failed request reloads the board.
 */
export function useEditor(
  board: Board,
  apply: (event: BoardEvent) => void,
  resync: () => void,
): Editor {
  const queue = useRef<Promise<void>>(Promise.resolve());
  const history = useRef<History>(emptyHistory);
  // The board with this tab's edits applied, ahead of the render that shows them.
  const latest = useRef(board);

  useLayoutEffect(() => {
    latest.current = board;
  }, [board]);

  const commit = useCallback(
    (event: BoardEvent, request: () => Promise<void>) => {
      latest.current = applyEvent(latest.current, event);
      apply(event);
      queue.current = queue.current.then(request).catch((error: unknown) => {
        toast.error('Could not save the change', { description: errorMessage(error) });
        resync();
      });
    },
    [apply, resync],
  );

  const write = useCallback(
    (change: BoardEdit) => {
      const { saved = [], deleted = [], strokes } = inWriteOrder(latest.current, change);
      for (const id of deleted) {
        commit({ type: 'item-removed', id }, () => deleteRequest(`/api/items/${id}`));
      }
      for (const item of saved) {
        const { id, ...content } = item;
        commit({ type: 'item', item }, () =>
          putJson(`/api/items/${id}`, content satisfies ItemContent),
        );
      }
      if (strokes !== undefined) {
        commit({ type: 'strokes', strokes }, () => putJson('/api/strokes', strokes));
      }
    },
    [commit],
  );

  const edit = useCallback(
    (change: BoardEdit) => {
      history.current = pushStep(history.current, recordStep(latest.current, change));
      write(change);
    },
    [write],
  );

  const travel = useCallback(
    (direction: Direction) => {
      const step = nextStep(history.current, direction);
      if (step === undefined) return;
      const { change, applied, skipped } = revert(latest.current, step, direction);
      history.current = afterRevert(history.current, direction, applied);
      write(change);
      if (skipped.length > 0) {
        toast.warning(NOTICE[direction], {
          description: `Changed since, so left as it is: ${skipped.join(', ')}`,
        });
      }
    },
    [write],
  );

  const undo = useCallback(() => {
    travel('undo');
  }, [travel]);
  const redo = useCallback(() => {
    travel('redo');
  }, [travel]);

  return { edit, undo, redo };
}
