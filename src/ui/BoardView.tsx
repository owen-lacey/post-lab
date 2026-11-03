import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
  type OnConnect,
  type OnDelete,
  type OnNodeDrag,
  type XYPosition,
} from '@xyflow/react';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { newItemId } from '@/lib/ids';
import { cn } from '@/lib/utils';
import type { Board } from '../shared/board';
import { useBoard } from './board-context';
import { mergeEdges, mergeNodes } from './canvas/merge';
import { newConnector } from './canvas/new-item';
import { edgeTypes, nodeTypes } from './canvas/node-types';
import { frameBoxes, placeDropped, placementChanged } from './canvas/placement';
import { toFlow, type ConnectorEdge, type ItemNode, type PositionedItem } from './canvas/to-flow';
import { useImageDrop } from './canvas/use-image-drop';
import { ProblemsPanel } from './ProblemsPanel';
import { CreateToolbar, type PendingItem } from './toolbar/CreateToolbar';
import { StylePicker } from './toolbar/StylePicker';

const isValidConnection: IsValidConnection = (connection) =>
  connection.source !== connection.target;

/**
 * Nodes and edges on screen: rebuilt from the board's items whenever they change, and changed
 * directly by React Flow while the user selects, drags and resizes.
 */
function useFlowState(board: Board) {
  const flow = useMemo(() => toFlow(board.items), [board.items]);
  const [shown, setShown] = useState(flow);
  const [nodes, setNodes] = useState(flow.nodes);
  const [edges, setEdges] = useState(flow.edges);
  const [selectId, setSelectId] = useState<string | undefined>(undefined);

  if (flow !== shown) {
    setShown(flow);
    setNodes(mergeNodes(flow.nodes, nodes, selectId));
    setEdges(mergeEdges(flow.edges, edges));
    setSelectId(undefined);
  }

  const onNodesChange = (changes: NodeChange<ItemNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  };
  const onEdgesChange = (changes: EdgeChange<ConnectorEdge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  };

  return { nodes, edges, onNodesChange, onEdgesChange, selectOnCreate: setSelectId };
}

/**
 * The toolbar's pending item and where it lands: centred on the next click on the board, inside
 * the frame under it if there is one. Escape cancels.
 */
function usePlacement(nodes: ItemNode[], onPlace: (item: PositionedItem) => void) {
  const { screenToFlowPosition } = useReactFlow();
  const [pending, setPending] = useState<PendingItem | undefined>(undefined);

  useEffect(() => {
    if (pending === undefined) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPending(undefined);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [pending]);

  const place = (event: MouseEvent) => {
    if (pending === undefined) return;
    const centre = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const item = pending.make(newItemId(), centre);
    setPending(undefined);
    onPlace(placeDropped(item, { x: item.x, y: item.y, w: item.w, h: item.h }, frameBoxes(nodes)));
  };

  return { pending, setPending, place };
}

function Canvas({ repo, board }: { repo: string; board: Board }) {
  const { saveItem, deleteItems, setEditingId } = useBoard();
  const { nodes, edges, onNodesChange, onEdgesChange, selectOnCreate } = useFlowState(board);

  /** Saves where each dragged item landed, moving it into or out of a frame. */
  const onNodeDragStop: OnNodeDrag<ItemNode> = (_event, _node, dragged) => {
    const moved = new Map(dragged.map((node) => [node.id, node]));
    const current = nodes.map((node) => moved.get(node.id) ?? node);
    const positions = new Map<string, XYPosition>(current.map((node) => [node.id, node.position]));
    const frames = frameBoxes(current);
    for (const node of dragged) {
      const item = node.data.item;
      const parent = node.parentId === undefined ? undefined : positions.get(node.parentId);
      const box = {
        x: node.position.x + (parent?.x ?? 0),
        y: node.position.y + (parent?.y ?? 0),
        w: item.w,
        h: item.h,
      };
      const placed = placeDropped(item, box, frames);
      if (placementChanged(item, placed)) saveItem(placed);
    }
  };

  const onDelete: OnDelete<ItemNode, ConnectorEdge> = (removed) => {
    deleteItems([...removed.nodes, ...removed.edges].map((element) => element.id));
  };

  const onConnect: OnConnect = (connection) => {
    saveItem(newConnector(newItemId(), connection.source, connection.target));
  };

  /** A new item is selected; one whose text is typed on the board opens for editing. */
  const placement = usePlacement(nodes, (item) => {
    selectOnCreate(item.id);
    saveItem(item);
    if (item.type !== 'cell' && item.type !== 'link') setEditingId(item.id);
  });

  const imageDrop = useImageDrop(nodes, (item) => {
    selectOnCreate(item.id);
    saveItem(item);
  });

  const selected = nodes.filter((node) => node.selected === true).map((node) => node.data.item);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onDelete={onDelete}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onDragOver={imageDrop.onDragOver}
      onDrop={imageDrop.onDrop}
      onPaneClick={placement.place}
      onNodeClick={placement.place}
      className={cn(placement.pending && 'flow-surfaces:cursor-crosshair!')}
      onNodeDoubleClick={(_event, node) => {
        setEditingId(node.id);
      }}
      onEdgeDoubleClick={(_event, edge) => {
        setEditingId(edge.id);
      }}
      // Like Excalidraw: scrolling pans in both directions; Cmd (Ctrl elsewhere) + scroll and
      // trackpad pinch zoom. React Flow's `zoomActivationKeyCode` default supplies the key.
      panOnScroll
      deleteKeyCode={['Backspace', 'Delete']}
      zoomOnDoubleClick={false}
      fitView
    >
      <Background />
      <Controls showInteractive={false} />
      <Panel position="top-left">
        <h1 className="font-heading text-lg font-semibold">{repo}</h1>
      </Panel>
      <Panel position="top-center">
        <CreateToolbar active={placement.pending?.tool} onPick={placement.setPending} />
      </Panel>
      <Panel position="top-right">
        <ProblemsPanel problems={board.problems} />
      </Panel>
      <Panel position="bottom-center">
        <StylePicker items={selected} />
      </Panel>
    </ReactFlow>
  );
}

/** The board: pan, zoom and edit. Every edit is saved to the item's file. */
export function BoardView(props: { repo: string; board: Board }) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
