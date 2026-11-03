import { Handle, NodeResizer, Position, useConnection } from '@xyflow/react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useBoard } from '../board-context';
import { withFinalNewline } from './text';
import { CENTRE_SOURCE, CENTRE_TARGET, type PositionedItem } from './to-flow';

/**
 * Connection handles. Hidden handles at the centre carry the edges, so connectors run centre
 * to centre. A handle just outside the right edge (clear of the resize controls), shown on hover
 * or selection, starts a connection; while one is being drawn the whole item is a drop target.
 */
export function ItemHandles() {
  const connecting = useConnection((connection) => connection.inProgress);
  return (
    <>
      <Handle
        id={CENTRE_TARGET}
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="top-1/2! opacity-0"
      />
      <Handle
        id={CENTRE_SOURCE}
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="top-1/2! bottom-auto! opacity-0"
      />
      <Handle
        id="connect"
        type="source"
        position={Position.Right}
        className="-right-4! size-3! border-2! border-background! bg-primary! opacity-0 transition-opacity group-hover:opacity-100 group-[.selected]:opacity-100"
      />
      {connecting && (
        <Handle
          id="drop"
          type="target"
          position={Position.Left}
          className="inset-0! size-full! transform-none! rounded-none! border-0! opacity-0"
        />
      )}
    </>
  );
}

/** Resize handles on the selected item; the new box is saved when the resize ends. */
export function ItemResizer({ item, selected }: { item: PositionedItem; selected: boolean }) {
  const { edit } = useBoard();
  return (
    <NodeResizer
      isVisible={selected}
      minWidth={40}
      minHeight={24}
      onResizeEnd={(_, box) => {
        const resized = {
          ...item,
          x: Math.round(box.x),
          y: Math.round(box.y),
          w: Math.round(box.width),
          h: Math.round(box.height),
        };
        edit({ saved: [resized] });
      }}
    />
  );
}

/** Item text exactly as typed: markdown is not rendered (D3). */
export function ItemText({ body, className }: { body: string; className?: string }) {
  return <p className={cn('wrap-break-word whitespace-pre-wrap', className)}>{body}</p>;
}

interface TextEditorProps {
  initial: string;
  singleLine?: boolean;
  className?: string;
  onDone: (text: string | undefined) => void;
}

/**
 * Inline editor: saves on blur or Ctrl/Cmd+Enter (Enter alone in a single line), cancels on
 * Escape. `onDone` gets the new text, or undefined when cancelled.
 */
export function TextEditor({ initial, singleLine = false, className, onDone }: TextEditorProps) {
  const [draft, setDraft] = useState(singleLine ? initial.trimEnd() : initial);
  const done = useRef(false);
  const finish = (text: string | undefined) => {
    if (done.current) return;
    done.current = true;
    onDone(text);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') finish(undefined);
    const commits = singleLine || event.metaKey || event.ctrlKey;
    if (event.key === 'Enter' && commits) {
      event.preventDefault();
      finish(draft);
    }
  };
  const props = {
    autoFocus: true,
    value: draft,
    onChange: (event: { target: { value: string } }) => {
      setDraft(event.target.value);
    },
    onBlur: () => {
      finish(draft);
    },
    onKeyDown,
    className: cn('nodrag nopan nowheel bg-background', className),
  };
  return singleLine ? <Input {...props} /> : <Textarea {...props} />;
}

interface EditableTextProps {
  item: PositionedItem;
  className?: string;
  editorClassName?: string;
  singleLine?: boolean;
}

/** The item's body, or an editor for it while the item is being edited (double-click). */
export function EditableText({ item, className, editorClassName, singleLine }: EditableTextProps) {
  const { editingId, setEditingId, edit } = useBoard();
  if (editingId !== item.id) return <ItemText body={item.body} className={className} />;
  return (
    <TextEditor
      initial={item.body}
      singleLine={singleLine}
      className={editorClassName}
      onDone={(text) => {
        setEditingId(undefined);
        if (text === undefined) return;
        const body = withFinalNewline(text);
        if (body !== item.body) edit({ saved: [{ ...item, body }] });
      }}
    />
  );
}
