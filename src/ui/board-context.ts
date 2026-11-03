import { createContext, useContext } from 'react';
import type { OutputFile } from '../shared/board';

export interface BoardContextValue {
  outputs: Record<string, OutputFile[]>;
  /** Reloads the board from disk (after a cell run; M4 replaces this with live sync). */
  refresh: () => Promise<void>;
}

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard(): BoardContextValue {
  const value = useContext(BoardContext);
  if (value === null) throw new Error('useBoard must be used inside a BoardContext provider.');
  return value;
}
