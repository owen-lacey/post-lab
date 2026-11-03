import { z } from 'zod';
import {
  ALIGNS,
  COLORS,
  DEFAULT_ALIGN,
  DEFAULT_COLOR,
  DEFAULT_SIZE,
  SHAPES,
  SIZES,
} from './palette';

/** Item IDs are also the item file stems. */
export const ID_PATTERN = /^[0-9a-z]{8}$/;

const id = (description: string) =>
  z.string().regex(ID_PATTERN, 'must be 8 characters from 0-9 and a-z').meta({ description });

const color = (fallback: string) =>
  z
    .enum(COLORS)
    .optional()
    .meta({ description: `Palette colour. Default \`${fallback}\`.` });
const size = z
  .enum(SIZES)
  .optional()
  .meta({ description: `Text size: small, medium or large. Default \`${DEFAULT_SIZE}\`.` });
const align = (fallback: string) =>
  z
    .enum(ALIGNS)
    .optional()
    .meta({ description: `Text alignment. Default \`${fallback}\`.` });

const itemType = <T extends string>(type: T) =>
  z.literal(type).meta({ description: 'Item type; decides which other fields apply.' });

/** Fields shared by every item that has a position, in file order. */
const positioned = {
  x: z.int().meta({
    description: 'Left edge in canvas pixels (relative to the frame when `frame` is set).',
  }),
  y: z.int().meta({
    description: 'Top edge in canvas pixels (relative to the frame when `frame` is set).',
  }),
  w: z.int().positive().meta({ description: 'Width in canvas pixels.' }),
  h: z.int().positive().meta({ description: 'Height in canvas pixels.' }),
  z: z.int().optional().meta({
    description: 'Draw order; higher draws on top. Default 0, ties broken by ID.',
  }),
};

const inFrame = {
  frame: id(
    'ID of the frame this item sits in. Positions are then relative to the frame.',
  ).optional(),
};

export const noteSchema = z.strictObject({
  type: itemType('note'),
  ...positioned,
  ...inFrame,
  color: color(DEFAULT_COLOR.note),
  size,
  align: align(DEFAULT_ALIGN.note),
});

export const textSchema = z.strictObject({
  type: itemType('text'),
  ...positioned,
  ...inFrame,
  color: color(DEFAULT_COLOR.text),
  size,
  align: align(DEFAULT_ALIGN.text),
});

export const shapeSchema = z.strictObject({
  type: itemType('shape'),
  ...positioned,
  ...inFrame,
  shape: z.enum(SHAPES).meta({ description: 'Outline of the shape.' }),
  color: color(DEFAULT_COLOR.shape),
  size,
  align: align(DEFAULT_ALIGN.shape),
});

export const frameSchema = z.strictObject({
  type: itemType('frame'),
  ...positioned,
  color: color(DEFAULT_COLOR.frame),
});

/** Path inside `assets/`, with no `.`-prefixed segments (so no `..`). */
const ASSET_PATH = /^assets(\/[^/.][^/]*)+$/;

export const imageSchema = z.strictObject({
  type: itemType('image'),
  ...positioned,
  ...inFrame,
  src: z
    .string()
    .regex(ASSET_PATH, 'must be a path inside assets/, e.g. assets/photo.png')
    .meta({ description: 'Image file, relative to `.post-lab/`, inside `assets/`.' }),
});

export const linkSchema = z.strictObject({
  type: itemType('link'),
  ...positioned,
  ...inFrame,
  url: z.url().meta({ description: 'The linked page.' }),
  preview: z
    .strictObject({
      title: z.string().optional(),
      description: z.string().optional(),
      image: z.url().optional(),
    })
    .optional()
    .meta({ description: 'Open Graph preview. Written by post-lab; leave it out.' }),
});

export const cellSchema = z.strictObject({
  type: itemType('cell'),
  ...positioned,
  ...inFrame,
  command: z.string().min(1).meta({
    description: 'Shell command that produces the outputs, e.g. `uv run analysis/churn.py`.',
  }),
  cwd: z.string().optional().meta({
    description: 'Directory to run in, relative to the repo root. Default: the repo root.',
  }),
});

export const connectorSchema = z.strictObject({
  type: itemType('connector'),
  from: id('ID of the item the connector starts at.'),
  to: id('ID of the item the connector ends at.'),
});

/** Every item schema by type, in the order the guide lists them. */
export const ITEM_SCHEMAS = {
  note: noteSchema,
  text: textSchema,
  shape: shapeSchema,
  frame: frameSchema,
  image: imageSchema,
  link: linkSchema,
  cell: cellSchema,
  connector: connectorSchema,
} as const;

export type ItemType = keyof typeof ITEM_SCHEMAS;

export const itemFrontmatterSchema = z.discriminatedUnion('type', [
  noteSchema,
  textSchema,
  shapeSchema,
  frameSchema,
  imageSchema,
  linkSchema,
  cellSchema,
  connectorSchema,
]);

export type ItemFrontmatter = z.infer<typeof itemFrontmatterSchema>;

/** An item as the API sends it: its file stem, its frontmatter and its body. */
export type Item = ItemFrontmatter & { id: string; body: string };

export const strokesSchema = z.strictObject({
  strokes: z.array(
    z.strictObject({
      id: id('Stroke ID.'),
      color: z.enum(COLORS),
      size: z.enum(SIZES),
      points: z.array(z.tuple([z.number(), z.number(), z.number()])),
    }),
  ),
});

export type Strokes = z.infer<typeof strokesSchema>;
