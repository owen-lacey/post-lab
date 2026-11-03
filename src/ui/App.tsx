import { CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getJson } from '@/lib/api';
import type { Board } from '../shared/board';
import { BoardView } from './BoardView';

interface Info {
  repo: string;
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; info: Info; board: Board }
  | { status: 'error'; message: string };

function Body({ state }: { state: State }) {
  switch (state.status) {
    case 'loading':
      return null;
    case 'ready':
      return <BoardView repo={state.info.repo} board={state.board} />;
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
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );
  }, []);

  return (
    <main className="h-svh bg-background text-foreground">
      <Body state={state} />
    </main>
  );
}
