import { CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getJson } from '@/lib/api';

interface Info {
  repo: string;
}

type State =
  { status: 'loading' } | { status: 'ready'; info: Info } | { status: 'error'; message: string };

function Body({ state }: { state: State }) {
  switch (state.status) {
    case 'loading':
      return null;
    case 'ready':
      return <p className="text-muted-foreground">Boards for {state.info.repo}</p>;
    case 'error':
      return (
        <Alert variant="destructive" className="max-w-md">
          <CircleAlert />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      );
  }
}

export function App() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    getJson<Info>('/api/info').then(
      (info) => {
        setState({ status: 'ready', info });
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
    <main className="flex min-h-svh flex-col gap-4 bg-background p-6 text-foreground">
      <h1 className="font-heading text-xl font-semibold">post-lab</h1>
      <Body state={state} />
    </main>
  );
}
