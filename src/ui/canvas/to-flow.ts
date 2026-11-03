import type { Edge, Node, NodeProps } from '@xyflow/react';
import type { Item } from '../../shared/schemas';

export type PositionedItem = Exclude<Item, { type: 'connector' }>;
export type ConnectorItem = Extract<Item, { type: 'connector' }>;
export type ItemOf<T extends PositionedItem['type']> = Extract<PositionedItem, { type: T }>;

export type ItemNode = {
  [T in PositionedItem['type']]: Node<{ item: ItemOf<T> }, T>;
}[PositionedItem['type']];

export type ItemNodeProps<T extends PositionedItem['type']> = NodeProps<
  Extract<ItemNode, { type: T }>
>;

export type ConnectorEdge = Edge<{ connector: ConnectorItem }, 'connector'>;

/** Hidden handles at each item's centre, so connectors run centre to centre. */
export const CENTRE_SOURCE = 'centre-source';
export const CENTRE_TARGET = 'centre-target';

function isConnector(item: Item): item is ConnectorItem {
  return item.type === 'connector';
}

/** Frames first (React Flow needs parents before children), then draw order, then ID. */
function drawOrder(a: PositionedItem, b: PositionedItem): number {
  const frames = Number(b.type === 'frame') - Number(a.type === 'frame');
  if (frames !== 0) return frames;
  const z = (a.z ?? 0) - (b.z ?? 0);
  if (z !== 0) return z;
  return a.id < b.id ? -1 : 1;
}

function toNode(item: PositionedItem): ItemNode {
  return {
    id: item.id,
    type: item.type,
    position: { x: item.x, y: item.y },
    width: item.w,
    height: item.h,
    zIndex: item.z ?? 0,
    parentId: item.type === 'frame' ? undefined : item.frame,
    // Lets node parts react to hovering or selecting the node (`group-hover:`, `group-[.selected]:`).
    className: 'group',
    data: { item },
  } as ItemNode;
}

function toEdge(connector: ConnectorItem): ConnectorEdge {
  return {
    id: connector.id,
    source: connector.from,
    target: connector.to,
    sourceHandle: CENTRE_SOURCE,
    targetHandle: CENTRE_TARGET,
    type: 'connector',
    data: { connector },
  };
}

/** Maps board items to React Flow nodes (frames as sub flows) and edges (connectors). */
export function toFlow(items: Item[]): { nodes: ItemNode[]; edges: ConnectorEdge[] } {
  const connectors = items.filter(isConnector);
  const positioned = items.filter((item): item is PositionedItem => !isConnector(item));
  return {
    nodes: positioned.sort(drawOrder).map(toNode),
    edges: connectors.map(toEdge),
  };
}
