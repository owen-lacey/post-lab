import type { XYPosition } from '@xyflow/react';
import {
  Frame,
  Link2,
  Square,
  SquareTerminal,
  StickyNote,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { useState, type SyntheticEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { linkSchema } from '../../shared/schemas';
import { newCell, newFrame, newLink, newNote, newShape, newText } from '../canvas/new-item';
import type { PositionedItem } from '../canvas/to-flow';

/** An item waiting for the user to click where it goes, made centred on that point. */
export interface PendingItem {
  tool: string;
  make: (id: string, centre: XYPosition) => PositionedItem;
}

interface ToolbarProps {
  /** The tool whose item is waiting to be placed. */
  active: string | undefined;
  /** Picks a tool (its item is placed on the next click), or cancels with undefined. */
  onPick: (pending: PendingItem | undefined) => void;
}

interface ToolProps {
  label: string;
  icon: LucideIcon;
}

function ToolButton({
  label,
  icon: Icon,
  active,
  ...props
}: ToolProps & { active: boolean; onClick?: () => void }) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size="icon"
      aria-label={label}
      aria-pressed={active}
      title={label}
      {...props}
    >
      <Icon />
    </Button>
  );
}

/** A tool whose item needs a field filled in first; it is ready to place on submit. */
function FormTool({
  label,
  icon,
  active,
  valid,
  onSubmit,
  children,
}: ToolProps & { active: boolean; valid: boolean; onSubmit: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (!valid) return;
    onSubmit();
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolButton label={label} icon={icon} active={active} />
      </PopoverTrigger>
      <PopoverContent>
        <form className="flex flex-col gap-2" onSubmit={submit}>
          {children}
          <Button type="submit" size="sm" disabled={!valid}>
            Add {label.toLowerCase()}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/** Item tools: pick one, then click on the board where the item goes (Escape cancels). */
export function CreateToolbar({ active, onPick }: ToolbarProps) {
  const [command, setCommand] = useState('');
  const [cwd, setCwd] = useState('');
  const [url, setUrl] = useState('');

  /** Clicking the active tool again puts it down. */
  const pick = (tool: string, make: PendingItem['make']) => {
    onPick(active === tool ? undefined : { tool, make });
  };
  const simpleTool = (label: string, icon: LucideIcon, make: PendingItem['make']) => (
    <ToolButton
      label={label}
      icon={icon}
      active={active === label}
      onClick={() => {
        pick(label, make);
      }}
    />
  );

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
      {simpleTool('Note', StickyNote, newNote)}
      {simpleTool('Text', Type, newText)}
      {simpleTool('Shape', Square, newShape)}
      {simpleTool('Frame', Frame, newFrame)}
      <FormTool
        label="Cell"
        icon={SquareTerminal}
        active={active === 'Cell'}
        valid={command.trim() !== ''}
        onSubmit={() => {
          const trimmed = command.trim();
          const folder = cwd.trim() === '' ? undefined : cwd.trim();
          onPick({ tool: 'Cell', make: (id, centre) => newCell(id, centre, trimmed, folder) });
          setCommand('');
          setCwd('');
        }}
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
      </FormTool>
      <FormTool
        label="Link"
        icon={Link2}
        active={active === 'Link'}
        valid={linkSchema.shape.url.safeParse(url.trim()).success}
        onSubmit={() => {
          const trimmed = url.trim();
          onPick({ tool: 'Link', make: (id, centre) => newLink(id, centre, trimmed) });
          setUrl('');
        }}
      >
        <Input
          autoFocus
          aria-label="URL"
          placeholder="https://…"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
          }}
        />
      </FormTool>
    </div>
  );
}
