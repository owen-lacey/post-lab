import { Background, Controls, Panel, ReactFlow } from '@xyflow/react';
import { useMemo } from 'react';
import type { Board } from '../shared/board';
import { nodeTypes } from './canvas/node-types';
import { toFlow } from './canvas/to-flow';
import { ProblemsPanel } from './ProblemsPanel';

/** The board, read-only: pan and zoom only (editing arrives in M4). */
export function BoardView({ repo, board }: { repo: string; board: Board }) {
  const { nodes, edges } = useMemo(() => toFlow(board.items), [board.items]);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      fitView
    >
      <Background />
      <Controls showInteractive={false} />
      <Panel position="top-left">
        <h1 className="font-heading text-lg font-semibold">{repo}</h1>
      </Panel>
      <Panel position="top-right">
        <ProblemsPanel problems={board.problems} />
      </Panel>
    </ReactFlow>
  );
}
