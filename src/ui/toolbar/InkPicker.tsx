import { COLORS, SIZES, type Color, type Size } from '../../shared/palette';
import type { InkToken } from '../canvas/stroke-edits';
import { ColorSwatch, TokenBar, TokenGroup } from './token-group';
import { SIZE_LABELS } from './token-values';

interface InkPickerProps {
  /** The shared colour, or '' when the strokes differ. */
  color: Color | '';
  /** The shared size, or '' when the strokes differ. */
  size: Size | '';
  onChange: (token: InkToken) => void;
}

/** Colour and size for freehand strokes: the pen's while drawing, or the selected strokes'. */
export function InkPicker({ color, size, onChange }: InkPickerProps) {
  return (
    <TokenBar
      groups={[
        <TokenGroup
          key="color"
          label="Colour"
          value={color}
          options={COLORS}
          render={(option) => <ColorSwatch color={option as Color} />}
          onChange={(value) => {
            onChange({ color: value as Color });
          }}
        />,
        <TokenGroup
          key="size"
          label="Size"
          value={size}
          options={SIZES}
          render={(option) => SIZE_LABELS[option as Size]}
          onChange={(value) => {
            onChange({ size: value as Size });
          }}
        />,
      ]}
    />
  );
}
