import type { PositionedItem } from './to-flow';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameBox extends Box {
  id: string;
}

function contains(box: Box, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

/**
 * Where a dragged item lands, given its absolute box and the frames' absolute boxes in draw
 * order. An item whose centre is inside a frame becomes that frame's child, positioned
 * relative to it (the topmost frame wins); otherwise it is top level. Frames never nest.
 */
export function placeDropped(item: PositionedItem, box: Box, frames: FrameBox[]): PositionedItem {
  const x = Math.round(box.x);
  const y = Math.round(box.y);
  if (item.type === 'frame') return { ...item, x, y };
  const frame = frames.findLast((candidate) =>
    contains(candidate, box.x + box.w / 2, box.y + box.h / 2),
  );
  if (frame === undefined) return { ...item, x, y, frame: undefined };
  return {
    ...item,
    x: Math.round(box.x - frame.x),
    y: Math.round(box.y - frame.y),
    frame: frame.id,
  };
}

/** The frame an item sits in; frames themselves never sit in one. */
export function frameOf(item: PositionedItem): string | undefined {
  return item.type === 'frame' ? undefined : item.frame;
}

/** Whether a drop moved the item or changed its frame. */
export function placementChanged(before: PositionedItem, after: PositionedItem): boolean {
  return before.x !== after.x || before.y !== after.y || frameOf(before) !== frameOf(after);
}
