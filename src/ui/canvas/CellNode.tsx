import { CircleAlert, CircleCheck, LoaderCircle, Play, SquareTerminal } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { errorMessage, postJson } from '@/lib/api';
import type { RunResult } from '../../shared/board';
import { useBoard } from '../board-context';
import { OutputList } from '../outputs/OutputList';
import { CentreHandles, ItemText } from './node-parts';
import type { ItemNodeProps } from './to-flow';

interface Failure {
  title: string;
  detail: string;
}

type RunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'succeeded'; seconds: number }
  | { status: 'failed'; failure: Failure };

function failureOf(result: RunResult): Failure | undefined {
  if (result.ok) return undefined;
  const title =
    result.exitCode === undefined
      ? 'The command could not run'
      : `Exited with code ${String(result.exitCode)}`;
  return { title, detail: result.stderr };
}

/** Runs the cell, then reloads the board so its new outputs show. */
function useRun(id: string): [RunState, () => void] {
  const { refresh } = useBoard();
  const [state, setState] = useState<RunState>({ status: 'idle' });

  const run = () => {
    setState({ status: 'running' });
    const started = performance.now();
    postJson<RunResult>(`/api/cells/${id}/run`)
      .then(async (result) => {
        await refresh();
        const failure = failureOf(result);
        const seconds = (performance.now() - started) / 1000;
        setState(
          failure === undefined ? { status: 'succeeded', seconds } : { status: 'failed', failure },
        );
      })
      .catch((error: unknown) => {
        setState({
          status: 'failed',
          failure: { title: 'Run failed', detail: errorMessage(error) },
        });
      });
  };

  return [state, run];
}

function RunFailure({ failure }: { failure: Failure }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>{failure.title}</AlertTitle>
      {failure.detail !== '' && (
        <AlertDescription>
          <pre className="max-h-40 w-full overflow-auto font-mono text-xs whitespace-pre-wrap">
            {failure.detail}
          </pre>
        </AlertDescription>
      )}
    </Alert>
  );
}

function RunStatus({ state }: { state: RunState }) {
  if (state.status !== 'succeeded') return null;
  return (
    <span className="flex shrink-0 items-center gap-1 font-sans text-xs text-muted-foreground">
      <CircleCheck className="size-3.5" />
      Done in {state.seconds.toFixed(1)} s
    </span>
  );
}

export function CellNode({ data: { item } }: ItemNodeProps<'cell'>) {
  const { outputs } = useBoard();
  const [state, run] = useRun(item.id);
  const running = state.status === 'running';
  const files = outputs[item.id] ?? [];

  return (
    // React Flow turns off pointer events on nodes that are neither selectable nor draggable;
    // a cell has a Run button and scrollable outputs, so it takes them back.
    <div className="pointer-events-auto flex size-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <CentreHandles />
      <div className="flex items-center gap-2 border-b bg-muted px-3 py-2 font-mono text-sm">
        <SquareTerminal className="size-4 shrink-0 text-muted-foreground" />
        <code className="truncate">{item.command}</code>
        {item.cwd !== undefined && (
          <span className="shrink-0 text-xs text-muted-foreground">in {item.cwd}</span>
        )}
        <span className="ml-auto" />
        <RunStatus state={state} />
        <Button size="xs" className="nodrag shrink-0 font-sans" disabled={running} onClick={run}>
          {running ? <LoaderCircle className="animate-spin" /> : <Play />}
          {running ? 'Running' : 'Run'}
        </Button>
      </div>
      <ScrollArea className="nodrag nopan nowheel min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          {item.body.trim() !== '' && <ItemText body={item.body} className="text-sm" />}
          {state.status === 'failed' && <RunFailure failure={state.failure} />}
          <OutputList cellId={item.id} files={files} />
        </div>
      </ScrollArea>
    </div>
  );
}
