import type { Edge, Node, NodeProps } from '@xyflow/react';
import type { Item } from '../../shared/schemas';
import type { Stroke } from '../../shared/strokes-file';
import { strokeBounds } from './stroke-path';

export type PositionedItem = Exclude<Item, { type: 'connector' }>;
export type ConnectorItem = Extract<Item, { type: 'connector' }>;
export type ItemOf<T extends PositionedItem['type']> = Extract<PositionedItem, { type: T }>;

export type ItemNode = {
  [T in PositionedItem['type']]: Node<{ item: ItemOf<T> }, T>;
}[PositionedItem['type']];

export type ItemNodeProps<T extends PositionedItem['type']> = NodeProps<
  Extract<ItemNode, { type: T }>
>;

export type StrokeNode = Node<{ stroke: Stroke }, 'stroke'>;

/** Everything React Flow shows as a node: items and freehand strokes. */
export type CanvasNode = ItemNode | StrokeNode;

export type ConnectorEdge = Edge<{ connector: ConnectorItem }, 'connector'>;

/** Strokes are drawn above every item. */
export const STROKE_Z = 10_000;

export function isItemNode(node: CanvasNode): node is ItemNode {
  return node.type !== 'stroke';
}

export function isStrokeNode(node: CanvasNode): node is StrokeNode {
  return node.type === 'stroke';
}

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

/**
 * A node's size. Cells take their height from their content, at least `h`, so React Flow
 * measures them; everything else is exactly `w` by `h`.
 */
function sizeOf(item: PositionedItem): Pick<ItemNode, 'width' | 'height' | 'style'> {
  if (item.type === 'cell') return { width: item.w, style: { minHeight: item.h } };
  return { width: item.w, height: item.h };
}

function toNode(item: PositionedItem): ItemNode {
  return {
    id: item.id,
    type: item.type,
    position: { x: item.x, y: item.y },
    ...sizeOf(item),
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

/** A stroke as a node at its bounding box; only its ink catches the pointer (`StrokeNode`). */
function toStrokeNode(stroke: Stroke): StrokeNode {
  const box = strokeBounds(stroke);
  return {
    id: stroke.id,
    type: 'stroke',
    position: { x: box.x, y: box.y },
    width: box.w,
    height: box.h,
    zIndex: STROKE_Z,
    className: 'pointer-events-none!',
    data: { stroke },
  };
}

/**
 * Maps board items to React Flow nodes (frames as sub flows) and edges (connectors), and
 * strokes to nodes above them in file order.
 */
export function toFlow(
  items: Item[],
  strokes: Stroke[],
): { nodes: CanvasNode[]; edges: ConnectorEdge[] } {
  const connectors = items.filter(isConnector);
  const positioned = items.filter((item): item is PositionedItem => !isConnector(item));
  return {
    nodes: [...positioned.sort(drawOrder).map(toNode), ...strokes.map(toStrokeNode)],
    edges: connectors.map(toEdge),
  };
}
