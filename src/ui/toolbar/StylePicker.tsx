import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Circle,
  Diamond,
  Square,
  type LucideIcon,
} from 'lucide-react';
import {
  ALIGNS,
  COLORS,
  DEFAULT_ALIGN,
  DEFAULT_COLOR,
  DEFAULT_SIZE,
  SHAPES,
  SIZES,
  type Align,
  type Color,
  type ShapeKind,
} from '../../shared/palette';
import { useBoard } from '../board-context';
import type { ItemOf, PositionedItem } from '../canvas/to-flow';
import { ColorSwatch, TokenBar, TokenGroup } from './token-group';
import { shared, SIZE_LABELS } from './token-values';

type Colored = ItemOf<'note' | 'text' | 'shape' | 'frame'>;
type Styled = ItemOf<'note' | 'text' | 'shape'>;
type Token = 'color' | 'size' | 'align' | 'shape';

const isColored = (item: PositionedItem): item is Colored =>
  item.type === 'note' || item.type === 'text' || item.type === 'shape' || item.type === 'frame';
const isStyled = (item: PositionedItem): item is Styled =>
  item.type === 'note' || item.type === 'text' || item.type === 'shape';
const isShape = (item: PositionedItem): item is ItemOf<'shape'> => item.type === 'shape';

const ALIGN_ICONS: Record<Align, LucideIcon> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
};
const SHAPE_ICONS: Record<ShapeKind, LucideIcon> = {
  rectangle: Square,
  ellipse: Circle,
  diamond: Diamond,
};

/** Style tokens (R6a) for the selected items; a control shows when every item has that token. */
export function StylePicker({ items }: { items: PositionedItem[] }) {
  const { saveItem } = useBoard();
  const colored = items.every(isColored) ? items : [];
  const styled = items.every(isStyled) ? items : [];
  const shapes = items.every(isShape) ? items : [];

  const apply = (token: Token, value: string) => {
    for (const item of items) saveItem({ ...item, [token]: value });
  };

  const groups = [
    colored.length > 0 && (
      <TokenGroup
        key="color"
        label="Colour"
        value={shared(colored, (item) => item.color ?? DEFAULT_COLOR[item.type])}
        options={COLORS}
        render={(color) => <ColorSwatch color={color as Color} />}
        onChange={(value) => {
          apply('color', value);
        }}
      />
    ),
    styled.length > 0 && (
      <TokenGroup
        key="size"
        label="Size"
        value={shared(styled, (item) => item.size ?? DEFAULT_SIZE)}
        options={SIZES}
        render={(size) => SIZE_LABELS[size as (typeof SIZES)[number]]}
        onChange={(value) => {
          apply('size', value);
        }}
      />
    ),
    styled.length > 0 && (
      <TokenGroup
        key="align"
        label="Align"
        value={shared(styled, (item) => item.align ?? DEFAULT_ALIGN[item.type])}
        options={ALIGNS}
        render={(align) => {
          const Icon = ALIGN_ICONS[align as Align];
          return <Icon />;
        }}
        onChange={(value) => {
          apply('align', value);
        }}
      />
    ),
    shapes.length > 0 && (
      <TokenGroup
        key="shape"
        label="Shape"
        value={shared(shapes, (item) => item.shape)}
        options={SHAPES}
        render={(shape) => {
          const Icon = SHAPE_ICONS[shape as ShapeKind];
          return <Icon />;
        }}
        onChange={(value) => {
          apply('shape', value);
        }}
      />
    ),
  ].filter((group) => group !== false);

  if (groups.length === 0) return null;
  return <TokenBar groups={groups} />;
}
