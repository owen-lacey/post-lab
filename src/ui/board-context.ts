import { createContext, useContext } from 'react';
import type { OutputFile } from '../shared/board';
import type { Editor } from './use-editor';

export interface BoardContextValue extends Editor {
  outputs: Record<string, OutputFile[]>;
  /** The item or connector whose text is being edited inline. */
  editingId: string | undefined;
  setEditingId: (id: string | undefined) => void;
}

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard(): BoardContextValue {
  const value = useContext(BoardContext);
  if (value === null) throw new Error('useBoard must be used inside a BoardContext provider.');
  return value;
}
