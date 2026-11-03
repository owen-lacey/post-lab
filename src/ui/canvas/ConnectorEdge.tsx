import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';
import { useBoard } from '../board-context';
import { TextEditor } from './node-parts';
import { withFinalNewline } from './text';
import type { ConnectorEdge as ConnectorEdgeType } from './to-flow';

const EDITOR_WIDTH = 240;
const EDITOR_HEIGHT = 36;

/** A straight line between two items' centres, labelled by the connector's body (editable). */
export function ConnectorEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}: EdgeProps<ConnectorEdgeType>) {
  const { editingId, setEditingId, edit } = useBoard();
  const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  if (data === undefined) throw new Error(`Edge ${id} has no connector.`);
  const { connector } = data;
  const editing = editingId === id;
  const label = connector.body.trim();

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={20}
        label={editing || label === '' ? undefined : label}
        labelX={labelX}
        labelY={labelY}
        labelShowBg
        labelBgPadding={[6, 3]}
        labelBgBorderRadius={4}
      />
      {editing && (
        <foreignObject
          x={labelX - EDITOR_WIDTH / 2}
          y={labelY - EDITOR_HEIGHT / 2}
          width={EDITOR_WIDTH}
          height={EDITOR_HEIGHT}
        >
          <TextEditor
            initial={connector.body}
            singleLine
            onDone={(text) => {
              setEditingId(undefined);
              if (text === undefined) return;
              const body = withFinalNewline(text);
              if (body !== connector.body) edit({ saved: [{ ...connector, body }] });
            }}
          />
        </foreignObject>
      )}
    </>
  );
}
