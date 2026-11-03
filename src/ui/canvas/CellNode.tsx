import { CircleAlert, CircleCheck, LoaderCircle, Play, SquareTerminal } from 'lucide-react';
import { useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage, postJson } from '@/lib/api';
import type { RunResult } from '../../shared/board';
import { useBoard } from '../board-context';
import { OutputList } from '../outputs/OutputList';
import { ItemHandles, ItemResizer, ItemText } from './node-parts';
import { withFinalNewline } from './text';
import type { ItemNodeProps, ItemOf } from './to-flow';

type CellItem = ItemOf<'cell'>;

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

/** Runs the cell. Its new outputs arrive through live sync. */
function useRun(id: string): [RunState, () => void] {
  const [state, setState] = useState<RunState>({ status: 'idle' });

  const run = () => {
    setState({ status: 'running' });
    const started = performance.now();
    postJson<RunResult>(`/api/cells/${id}/run`)
      .then((result) => {
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
          <pre className="w-full font-mono text-xs whitespace-pre-wrap">{failure.detail}</pre>
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

/** Edits the command, its folder and the description; Ctrl/Cmd+Enter saves, Escape cancels. */
function CellEditor({ item }: { item: CellItem }) {
  const { saveItem, setEditingId } = useBoard();
  const [command, setCommand] = useState(item.command);
  const [cwd, setCwd] = useState(item.cwd ?? '');
  const [body, setBody] = useState(item.body);
  const valid = command.trim() !== '';

  const save = (event?: SyntheticEvent) => {
    event?.preventDefault();
    if (!valid) return;
    setEditingId(undefined);
    const trimmedCwd = cwd.trim();
    saveItem({
      ...item,
      command: command.trim(),
      cwd: trimmedCwd === '' ? undefined : trimmedCwd,
      body: withFinalNewline(body),
    });
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setEditingId(undefined);
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) save();
  };

  return (
    <form
      className="nodrag nopan nowheel flex flex-col gap-2 p-3"
      onSubmit={save}
      onKeyDown={onKeyDown}
    >
      <Input
        autoFocus
        aria-label="Command"
        placeholder="Command, e.g. uv run analysis/churn.py"
        className="font-mono"
        value={command}
        onChange={(event) => {
          setCommand(event.target.value);
        }}
      />
      <Input
        aria-label="Folder"
        placeholder="Folder to run in (default: repo root)"
        className="font-mono"
        value={cwd}
        onChange={(event) => {
          setCwd(event.target.value);
        }}
      />
      <Textarea
        aria-label="Description"
        placeholder="What the cell shows"
        className="resize-none"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
        }}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingId(undefined);
          }}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!valid}>
          Save
        </Button>
      </div>
    </form>
  );
}

function CellContent({ item, state }: { item: CellItem; state: RunState }) {
  const { outputs } = useBoard();
  return (
    <div className="nodrag nopan flex flex-col gap-3 p-3">
      {item.body.trim() !== '' && <ItemText body={item.body} className="text-sm" />}
      {state.status === 'failed' && <RunFailure failure={state.failure} />}
      <OutputList cellId={item.id} files={outputs[item.id] ?? []} />
    </div>
  );
}

/**
 * A code cell. It grows to fit its outputs, so nothing in it scrolls and the wheel always pans
 * the board; its `h` is the least height it takes (see `toFlow`).
 */
export function CellNode({ data: { item }, selected }: ItemNodeProps<'cell'>) {
  const { editingId } = useBoard();
  const [state, run] = useRun(item.id);
  const running = state.status === 'running';

  return (
    <div className="flex size-full min-h-[inherit] flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <ItemHandles />
      <ItemResizer item={item} selected={selected} />
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
      {editingId === item.id ? (
        <CellEditor item={item} />
      ) : (
        <CellContent item={item} state={state} />
      )}
    </div>
  );
}
