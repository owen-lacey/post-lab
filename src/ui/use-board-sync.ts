import { useCallback, useEffect, useReducer, useState } from 'react';
import { getJson } from '@/lib/api';
import { BOARD_EVENT_TYPES, type Board, type BoardEvent } from '../shared/board';
import { initialSyncState, reduceSync } from './board-state';

export interface BoardSync {
  board: Board | undefined;
  /** Why the board could not be fetched, if it could not. */
  error: unknown;
  /** Applies a change made in this UI before it is saved. */
  apply: (event: BoardEvent) => void;
  /** Fetches the whole board again (disk is the truth). */
  resync: () => void;
}

/**
 * Follows the board live (D8): listens to `/api/events` and fetches `/api/board` whenever the
 * stream opens, which covers the first connect and every reconnect.
 */
export function useBoardSync(): BoardSync {
  const [state, dispatch] = useReducer(reduceSync, initialSyncState);
  const [error, setError] = useState<unknown>(undefined);

  const resync = useCallback(() => {
    dispatch({ type: 'syncing' });
    getJson<Board>('/api/board').then(
      (board) => {
        setError(undefined);
        dispatch({ type: 'loaded', board });
      },
      (reason: unknown) => {
        setError(reason);
      },
    );
  }, []);

  useEffect(() => {
    const source = new EventSource('/api/events');
    const onEvent = (message: MessageEvent<string>) => {
      dispatch({ type: 'event', event: JSON.parse(message.data) as BoardEvent });
    };
    source.addEventListener('open', resync);
    for (const type of BOARD_EVENT_TYPES) source.addEventListener(type, onEvent);
    return () => {
      source.close();
    };
  }, [resync]);

  const apply = useCallback((event: BoardEvent) => {
    dispatch({ type: 'event', event });
  }, []);

  return { board: state.board, error, apply, resync };
}
