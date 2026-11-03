import type { Align, Color, Size } from '../../shared/palette';

interface ColorClasses {
  /** Soft fill for notes, shapes and frames. */
  fill: string;
  /** Border in the strong shade. */
  border: string;
  /** Text in the strong shade, for text items. */
  text: string;
  /** SVG fill and stroke, for shapes. */
  svg: string;
  /** SVG fill in the strong shade, for freehand strokes. */
  ink: string;
}

// Written out in full so Tailwind finds every class when it scans the source.
export const COLOR_CLASSES: Record<Color, ColorClasses> = {
  gray: {
    fill: 'bg-palette-gray',
    border: 'border-palette-gray-strong',
    text: 'text-palette-gray-strong',
    svg: 'fill-palette-gray stroke-palette-gray-strong',
    ink: 'fill-palette-gray-strong',
  },
  red: {
    fill: 'bg-palette-red',
    border: 'border-palette-red-strong',
    text: 'text-palette-red-strong',
    svg: 'fill-palette-red stroke-palette-red-strong',
    ink: 'fill-palette-red-strong',
  },
  orange: {
    fill: 'bg-palette-orange',
    border: 'border-palette-orange-strong',
    text: 'text-palette-orange-strong',
    svg: 'fill-palette-orange stroke-palette-orange-strong',
    ink: 'fill-palette-orange-strong',
  },
  yellow: {
    fill: 'bg-palette-yellow',
    border: 'border-palette-yellow-strong',
    text: 'text-palette-yellow-strong',
    svg: 'fill-palette-yellow stroke-palette-yellow-strong',
    ink: 'fill-palette-yellow-strong',
  },
  green: {
    fill: 'bg-palette-green',
    border: 'border-palette-green-strong',
    text: 'text-palette-green-strong',
    svg: 'fill-palette-green stroke-palette-green-strong',
    ink: 'fill-palette-green-strong',
  },
  blue: {
    fill: 'bg-palette-blue',
    border: 'border-palette-blue-strong',
    text: 'text-palette-blue-strong',
    svg: 'fill-palette-blue stroke-palette-blue-strong',
    ink: 'fill-palette-blue-strong',
  },
  purple: {
    fill: 'bg-palette-purple',
    border: 'border-palette-purple-strong',
    text: 'text-palette-purple-strong',
    svg: 'fill-palette-purple stroke-palette-purple-strong',
    ink: 'fill-palette-purple-strong',
  },
  pink: {
    fill: 'bg-palette-pink',
    border: 'border-palette-pink-strong',
    text: 'text-palette-pink-strong',
    svg: 'fill-palette-pink stroke-palette-pink-strong',
    ink: 'fill-palette-pink-strong',
  },
};

export const SIZE_CLASSES: Record<Size, string> = {
  s: 'text-sm',
  m: 'text-base',
  l: 'text-2xl font-medium',
};

export const ALIGN_CLASSES: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};
