import type { XYPosition } from '@xyflow/react';
import type { Item } from '../../shared/schemas';
import { isPlayable } from './playable';
import type { ItemOf, PositionedItem } from './to-flow';

/** The item types the toolbar creates (images arrive by paste or drop). */
export type NewItemType = Exclude<PositionedItem['type'], 'image'>;

export interface Size {
  w: number;
  h: number;
}

const SIZES: Record<NewItemType, Size> = {
  note: { w: 240, h: 180 },
  text: { w: 240, h: 60 },
  shape: { w: 160, h: 120 },
  frame: { w: 640, h: 420 },
  link: { w: 320, h: 140 },
  cell: { w: 640, h: 480 },
};

/** A link that plays inline: a 16:9 player under the link's header row. */
const PLAYER_SIZE: Size = { w: 480, h: 310 };

/** A box of the given size centred on `centre`, with whole-pixel coordinates. */
function centredBox(centre: XYPosition, { w, h }: Size) {
  return { x: Math.round(centre.x - w / 2), y: Math.round(centre.y - h / 2), w, h };
}

/** A box of the type's default size centred on `centre`. */
function box(type: NewItemType, centre: XYPosition) {
  return centredBox(centre, SIZES[type]);
}

export function newNote(id: string, centre: XYPosition): ItemOf<'note'> {
  return { type: 'note', ...box('note', centre), id, body: '' };
}

export function newText(id: string, centre: XYPosition): ItemOf<'text'> {
  return { type: 'text', ...box('text', centre), id, body: '' };
}

export function newShape(id: string, centre: XYPosition): ItemOf<'shape'> {
  return { type: 'shape', ...box('shape', centre), shape: 'rectangle', id, body: '' };
}

export function newFrame(id: string, centre: XYPosition): ItemOf<'frame'> {
  return { type: 'frame', ...box('frame', centre), id, body: '' };
}

export function newLink(id: string, centre: XYPosition, url: string): ItemOf<'link'> {
  const size = isPlayable(url) ? PLAYER_SIZE : SIZES.link;
  return { type: 'link', ...centredBox(centre, size), url, id, body: '' };
}

export function newImage(id: string, centre: XYPosition, src: string, size: Size): ItemOf<'image'> {
  return { type: 'image', ...centredBox(centre, size), src, id, body: '' };
}

export function newCell(
  id: string,
  centre: XYPosition,
  command: string,
  cwd: string | undefined,
): ItemOf<'cell'> {
  return { type: 'cell', ...box('cell', centre), command, cwd, id, body: '' };
}

export function newConnector(id: string, from: string, to: string): Item {
  return { type: 'connector', from, to, id, body: '' };
}
