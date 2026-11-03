import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

/** Hidden handles at the centre, so connectors run centre to centre. */
export function CentreHandles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="top-1/2! opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="top-1/2! bottom-auto! opacity-0"
      />
    </>
  );
}

/** Item text exactly as typed: markdown is not rendered (D3). */
export function ItemText({ body, className }: { body: string; className?: string }) {
  return <p className={cn('wrap-break-word whitespace-pre-wrap', className)}>{body}</p>;
}
