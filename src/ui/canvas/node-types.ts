import type { EdgeTypes, NodeTypes } from '@xyflow/react';
import { CellNode } from './CellNode';
import { ConnectorEdge } from './ConnectorEdge';
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

/** Connectors are the only edges. */
export const edgeTypes = { connector: ConnectorEdge } satisfies EdgeTypes;
