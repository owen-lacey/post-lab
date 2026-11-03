import type { NodeProps } from '@xyflow/react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { strokeShape } from './stroke-path';
import type { StrokeNode as StrokeNodeType } from './to-flow';
import { COLOR_CLASSES } from './tokens';

/**
 * A freehand stroke at its bounding box. The node itself lets the pointer through, so only the
 * ink selects or drags it and items under the empty part of the box stay clickable.
 */
export function StrokeNode({ data: { stroke }, selected }: NodeProps<StrokeNodeType>) {
  const { box, path } = useMemo(() => strokeShape(stroke), [stroke]);
  return (
    <svg
      width={box.w}
      height={box.h}
      viewBox={`0 0 ${String(box.w)} ${String(box.h)}`}
      className="overflow-visible"
    >
      {selected && (
        <rect
          width={box.w}
          height={box.h}
          rx={4}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
          className="fill-none stroke-ring"
        />
      )}
      <path d={path} className={cn('pointer-events-auto', COLOR_CLASSES[stroke.color].ink)} />
    </svg>
  );
}
