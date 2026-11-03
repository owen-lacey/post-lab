import { useReactFlow, ViewportPortal } from '@xyflow/react';
import { useState, type PointerEvent, type WheelEvent } from 'react';
import { cn } from '@/lib/utils';
import type { Color, Size } from '../../shared/palette';
import { roundPoint, type StrokePoint } from '../../shared/strokes-file';
import { outlinePath } from './stroke-path';
import { COLOR_CLASSES } from './tokens';

export interface Pen {
  color: Color;
  size: Size;
}

interface DrawLayerProps {
  pen: Pen;
  /** Called with a finished stroke's points, in board coordinates. */
  onStroke: (points: StrokePoint[]) => void;
}

/**
 * Covers the board while the draw tool is on, so a drag draws instead of panning or selecting,
 * even over cells and embedded players. Scrolling still pans.
 */
export function DrawLayer({ pen, onStroke }: DrawLayerProps) {
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();
  const [points, setPoints] = useState<StrokePoint[] | undefined>(undefined);

  const pointAt = (event: PointerEvent): StrokePoint => {
    const { x, y } = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    return roundPoint([x, y, event.pressure]);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPoints([pointAt(event)]);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (points === undefined) return;
    setPoints([...points, pointAt(event)]);
  };

  const onPointerUp = () => {
    if (points === undefined) return;
    if (points.length > 1) onStroke(points);
    setPoints(undefined);
  };

  const onWheel = (event: WheelEvent) => {
    const viewport = getViewport();
    void setViewport({ ...viewport, x: viewport.x - event.deltaX, y: viewport.y - event.deltaY });
  };

  return (
    <>
      <div
        className="absolute inset-0 z-5 cursor-crosshair touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      />
      {points !== undefined && (
        <ViewportPortal>
          <svg className="pointer-events-none absolute top-0 left-0 size-px overflow-visible">
            <path d={outlinePath(points, pen.size)} className={cn(COLOR_CLASSES[pen.color].ink)} />
          </svg>
        </ViewportPortal>
      )}
    </>
  );
}
