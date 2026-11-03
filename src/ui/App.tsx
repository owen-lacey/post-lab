import { CircleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorMessage, getJson } from '@/lib/api';
import type { Board } from '../shared/board';
import { BoardContext } from './board-context';
import { BoardView } from './BoardView';

interface Info {
  repo: string;
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; info: Info; board: Board }
  | { status: 'error'; message: string };

function Ready({
  info,
  board,
  refresh,
}: {
  info: Info;
  board: Board;
  refresh: () => Promise<void>;
}) {
  const context = useMemo(() => ({ outputs: board.outputs, refresh }), [board.outputs, refresh]);
  return (
    <BoardContext value={context}>
      <BoardView repo={info.repo} board={board} />
    </BoardContext>
  );
}

function Body({ state, refresh }: { state: State; refresh: () => Promise<void> }) {
  switch (state.status) {
    case 'loading':
      return null;
    case 'ready':
      return <Ready info={state.info} board={state.board} refresh={refresh} />;
    case 'error':
      return (
        <div className="p-6">
          <Alert variant="destructive" className="max-w-md">
            <CircleAlert />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        </div>
      );
  }
}

export function App() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    Promise.all([getJson<Info>('/api/info'), getJson<Board>('/api/board')]).then(
      ([info, board]) => {
        setState({ status: 'ready', info, board });
      },
      (error: unknown) => {
        setState({ status: 'error', message: errorMessage(error) });
      },
    );
  }, []);

  const refresh = useCallback(async () => {
    const board = await getJson<Board>('/api/board');
    setState((current) => (current.status === 'ready' ? { ...current, board } : current));
  }, []);

  return (
    <main className="h-svh bg-background text-foreground">
      <Body state={state} refresh={refresh} />
    </main>
  );
}
