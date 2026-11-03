import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Circle,
  Diamond,
  Square,
  type LucideIcon,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import {
  ALIGNS,
  COLORS,
  DEFAULT_ALIGN,
  DEFAULT_COLOR,
  DEFAULT_SIZE,
  SHAPES,
  SIZES,
  type Align,
  type ShapeKind,
} from '../../shared/palette';
import { useBoard } from '../board-context';
import { COLOR_CLASSES } from '../canvas/tokens';
import type { ItemOf, PositionedItem } from '../canvas/to-flow';

type Colored = ItemOf<'note' | 'text' | 'shape' | 'frame'>;
type Styled = ItemOf<'note' | 'text' | 'shape'>;
type Token = 'color' | 'size' | 'align' | 'shape';

const isColored = (item: PositionedItem): item is Colored =>
  item.type === 'note' || item.type === 'text' || item.type === 'shape' || item.type === 'frame';
const isStyled = (item: PositionedItem): item is Styled =>
  item.type === 'note' || item.type === 'text' || item.type === 'shape';
const isShape = (item: PositionedItem): item is ItemOf<'shape'> => item.type === 'shape';

const SIZE_LABELS = { s: 'S', m: 'M', l: 'L' } as const;
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

/** The value all items share, or '' when they differ. */
function shared<T>(items: T[], value: (item: T) => string): string {
  const values = new Set(items.map(value));
  return values.size === 1 ? ([...values][0] ?? '') : '';
}

interface TokenGroupProps {
  label: string;
  value: string;
  options: readonly string[];
  render: (option: string) => React.ReactNode;
  onChange: (value: string) => void;
}

function TokenGroup({ label, value, options, render, onChange }: TokenGroupProps) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        // Clicking the active option deselects it; tokens always have a value, so ignore that.
        if (next !== '') onChange(next);
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option} value={option} aria-label={`${label} ${option}`}>
          {render(option)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

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
        render={(color) => (
          <span
            className={cn(
              'size-4 rounded-full border-2',
              COLOR_CLASSES[color as (typeof COLORS)[number]].fill,
              COLOR_CLASSES[color as (typeof COLORS)[number]].border,
            )}
          />
        )}
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
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background p-1 shadow-sm">
      {groups.flatMap((group, index) =>
        index === 0
          ? [group]
          : [
              <Separator
                key={`separator-${String(index)}`}
                orientation="vertical"
                className="h-5"
              />,
              group,
            ],
      )}
    </div>
  );
}
