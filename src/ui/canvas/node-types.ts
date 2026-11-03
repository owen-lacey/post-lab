import type { NodeTypes } from '@xyflow/react';
import { CellNode } from './CellNode';
import { FrameNode, ImageNode, LinkNode, NoteNode, ShapeNode, TextNode } from './nodes';
import type { PositionedItem } from './to-flow';

/** One React Flow node type per positioned item type. Defined once, outside render. */
export const nodeTypes = {
  note: NoteNode,
  text: TextNode,
  shape: ShapeNode,
  frame: FrameNode,
  image: ImageNode,
  link: LinkNode,
  cell: CellNode,
} satisfies Record<PositionedItem['type'], NodeTypes[string]>;
