import type { Strokes } from '../../shared/schemas';
import { useBoard } from '../board-context';
import type { Pen } from '../canvas/DrawLayer';
import { restyleStrokes } from '../canvas/stroke-edits';
import { isItemNode, isStrokeNode, type CanvasNode } from '../canvas/to-flow';
import { InkPicker } from './InkPicker';
import { StylePicker } from './StylePicker';
import { shared } from './token-values';

interface SelectionPickerProps {
  nodes: CanvasNode[];
  strokes: Strokes;
  /** The pen, while the draw tool is on. */
  pen: Pen | undefined;
  onPenChange: (pen: Pen) => void;
}

/**
 * Style tokens for what is in hand: the pen while drawing, else the selected strokes or the
 * selected items. A selection mixing strokes and items has no tokens in common, so shows none.
 */
export function SelectionPicker({ nodes, strokes, pen, onPenChange }: SelectionPickerProps) {
  const { saveStrokes } = useBoard();
  if (pen !== undefined) {
    return (
      <InkPicker
        color={pen.color}
        size={pen.size}
        onChange={(token) => {
          onPenChange({ ...pen, ...token });
        }}
      />
    );
  }
  const selected = nodes.filter((node) => node.selected === true);
  const items = selected.filter(isItemNode).map((node) => node.data.item);
  const selectedStrokes = selected.filter(isStrokeNode).map((node) => node.data.stroke);
  if (selectedStrokes.length === 0) return <StylePicker items={items} />;
  if (items.length > 0) return null;
  const ids = new Set(selectedStrokes.map((stroke) => stroke.id));
  return (
    <InkPicker
      color={shared(selectedStrokes, (stroke) => stroke.color)}
      size={shared(selectedStrokes, (stroke) => stroke.size)}
      onChange={(token) => {
        saveStrokes(restyleStrokes(strokes, ids, token));
      }}
    />
  );
}
