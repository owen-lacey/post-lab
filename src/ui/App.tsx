import { CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getJson, UnauthorizedError } from '@/lib/api';

interface Info {
  repo: string;
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; info: Info }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

function toState(error: unknown): State {
  if (error instanceof UnauthorizedError) {
    return { status: 'unauthorized' };
  }
  return { status: 'error', message: error instanceof Error ? error.message : String(error) };
}

function Problem({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive" className="max-w-md">
      <CircleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function Body({ state }: { state: State }) {
  switch (state.status) {
    case 'loading':
      return null;
    case 'ready':
      return <p className="text-muted-foreground">Boards for {state.info.repo}</p>;
    case 'unauthorized':
      return (
        <Problem
          title="Not signed in"
          message="Restart post-lab from your repo to get a new sign-in link."
        />
      );
    case 'error':
      return <Problem title="Something went wrong" message={state.message} />;
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
        setState(toState(error));
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
