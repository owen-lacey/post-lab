import { z } from 'zod';
import {
  itemFrontmatterSchema,
  strokesSchema,
  type ItemFrontmatter,
  type Strokes,
} from '../shared/schemas';

const contentSchema = z.looseObject({ body: z.string() });

type Failure = { ok: false; message: string };

export type ParsedItemRequest = { ok: true; frontmatter: ItemFrontmatter; body: string } | Failure;

export type ParsedStrokesRequest = { ok: true; strokes: Strokes } | Failure;

function parseJson(text: string): { ok: true; json: unknown } | Failure {
  try {
    return { ok: true, json: JSON.parse(text) };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

/** Validates a `PUT /api/items/:id` body: the item's frontmatter fields plus its `body`. */
export function parseItemRequest(text: string): ParsedItemRequest {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const content = contentSchema.safeParse(parsed.json);
  if (!content.success) return { ok: false, message: z.prettifyError(content.error) };
  const { body, ...fields } = content.data;
  const frontmatter = itemFrontmatterSchema.safeParse(fields);
  if (!frontmatter.success) return { ok: false, message: z.prettifyError(frontmatter.error) };
  return { ok: true, frontmatter: frontmatter.data, body };
}

/** Validates a `PUT /api/strokes` body: the whole of `strokes.json`. */
export function parseStrokesRequest(text: string): ParsedStrokesRequest {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const strokes = strokesSchema.safeParse(parsed.json);
  if (!strokes.success) return { ok: false, message: z.prettifyError(strokes.error) };
  return { ok: true, strokes: strokes.data };
}
