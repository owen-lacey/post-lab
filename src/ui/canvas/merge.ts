import type { ConnectorEdge, ItemNode } from './to-flow';

/** Keeps what the user is doing to a node (selecting, dragging, resizing) when its item changes. */
function keepLocalState(node: ItemNode, prev: ItemNode): ItemNode {
  if (prev.data.item === node.data.item) return prev;
  if (prev.dragging === true || prev.resizing === true) {
    return {
      ...node,
      position: prev.position,
      width: prev.width,
      height: prev.height,
      dragging: prev.dragging,
      resizing: prev.resizing,
      selected: prev.selected,
    };
  }
  return { ...node, selected: prev.selected };
}

function withSelected(node: ItemNode, selected: boolean): ItemNode {
  return node.selected === selected ? node : { ...node, selected };
}

/**
 * Nodes for the latest items, merged with the nodes on screen: unchanged items keep their node
 * as it is. With `select`, that node becomes the only selected one (a newly created item).
 */
export function mergeNodes(next: ItemNode[], current: ItemNode[], select?: string): ItemNode[] {
  const byId = new Map(current.map((node) => [node.id, node]));
  return next.map((node) => {
    const prev = byId.get(node.id);
    const merged = prev === undefined ? node : keepLocalState(node, prev);
    return select === undefined ? merged : withSelected(merged, merged.id === select);
  });
}

/** Edges for the latest connectors; unchanged connectors keep their edge, and edges keep selection. */
export function mergeEdges(next: ConnectorEdge[], current: ConnectorEdge[]): ConnectorEdge[] {
  const byId = new Map(current.map((edge) => [edge.id, edge]));
  return next.map((edge) => {
    const prev = byId.get(edge.id);
    if (prev === undefined) return edge;
    if (prev.data?.connector === edge.data?.connector) return prev;
    return { ...edge, selected: prev.selected };
  });
}
