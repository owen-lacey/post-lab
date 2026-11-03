/** Style tokens for content items (R6a, D2). Each colour maps to theme tokens in the UI (R33). */
export const COLORS = [
  'gray',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
] as const;
export const SIZES = ['s', 'm', 'l'] as const;
export const ALIGNS = ['left', 'center', 'right'] as const;
export const SHAPES = ['rectangle', 'ellipse', 'diamond'] as const;

export type Color = (typeof COLORS)[number];
export type Size = (typeof SIZES)[number];
export type Align = (typeof ALIGNS)[number];
export type ShapeKind = (typeof SHAPES)[number];

/** Token values used when an item file leaves a token out. */
export const DEFAULT_COLOR = {
  note: 'yellow',
  text: 'gray',
  shape: 'blue',
  frame: 'gray',
} as const satisfies Record<string, Color>;
export const DEFAULT_SIZE: Size = 'm';
export const DEFAULT_ALIGN = {
  note: 'left',
  text: 'left',
  shape: 'center',
} as const satisfies Record<string, Align>;
