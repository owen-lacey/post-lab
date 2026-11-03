import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { deleteRequest, errorMessage, putJson } from '@/lib/api';
import type { BoardEvent, ItemContent } from '../shared/board';
import type { Item } from '../shared/schemas';

export interface Editor {
  /** Shows the item at once, then writes its file. */
  saveItem: (item: Item) => void;
  /** Removes the items at once, then deletes their files. */
  deleteItems: (ids: string[]) => void;
}

/**
 * Saves edits made on the canvas. Requests go out one at a time, in order, so two quick edits
 * to one item reach the disk in the order they were made. A failed request reloads the board.
 */
export function useEditor(apply: (event: BoardEvent) => void, resync: () => void): Editor {
  const queue = useRef<Promise<void>>(Promise.resolve());

  const send = useCallback(
    (request: () => Promise<void>) => {
      queue.current = queue.current.then(request).catch((error: unknown) => {
        toast.error('Could not save the change', { description: errorMessage(error) });
        resync();
      });
    },
    [resync],
  );

  const saveItem = useCallback(
    (item: Item) => {
      apply({ type: 'item', item });
      const { id, ...content } = item;
      send(() => putJson(`/api/items/${id}`, content satisfies ItemContent));
    },
    [apply, send],
  );

  const deleteItems = useCallback(
    (ids: string[]) => {
      for (const id of ids) {
        apply({ type: 'item-removed', id });
        send(() => deleteRequest(`/api/items/${id}`));
      }
    },
    [apply, send],
  );

  return { saveItem, deleteItems };
}
