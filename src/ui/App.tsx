import { CircleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/sonner';
import { errorMessage, getJson } from '@/lib/api';
import type { Board } from '../shared/board';
import { BoardContext } from './board-context';
import { BoardView } from './BoardView';
import { useBoardSync, type BoardSync } from './use-board-sync';
import { useEditor } from './use-editor';

interface Info {
  repo: string;
}

function Ready({ repo, board, sync }: { repo: string; board: Board; sync: BoardSync }) {
  const { edit, undo, redo } = useEditor(board, sync.apply, sync.resync);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const context = useMemo(
    () => ({ outputs: board.outputs, edit, undo, redo, editingId, setEditingId }),
    [board.outputs, edit, undo, redo, editingId],
  );
  return (
    <BoardContext value={context}>
      <BoardView repo={repo} board={board} />
    </BoardContext>
  );
}

function Failure({ message }: { message: string }) {
  return (
    <div className="p-6">
      <Alert variant="destructive" className="max-w-md">
        <CircleAlert />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}

function Body({ info, sync }: { info: Info | Error | undefined; sync: BoardSync }) {
  if (info instanceof Error) return <Failure message={info.message} />;
  if (sync.board === undefined) {
    return sync.error === undefined ? null : <Failure message={errorMessage(sync.error)} />;
  }
  if (info === undefined) return null;
  return <Ready repo={info.repo} board={sync.board} sync={sync} />;
}

export function App() {
  const [info, setInfo] = useState<Info | Error | undefined>(undefined);
  const sync = useBoardSync();
  const hasBoard = sync.board !== undefined;

  useEffect(() => {
    getJson<Info>('/api/info').then(setInfo, (error: unknown) => {
      setInfo(new Error(errorMessage(error)));
    });
  }, []);

  // With a board on screen, a failed reload is a notice; without one, Body shows it instead.
  useEffect(() => {
    if (hasBoard && sync.error !== undefined) {
      toast.error('Could not reload the board', { description: errorMessage(sync.error) });
    }
  }, [hasBoard, sync.error]);

  return (
    <main className="h-svh bg-background text-foreground">
      <Body info={info} sync={sync} />
      <Toaster />
    </main>
  );
}
