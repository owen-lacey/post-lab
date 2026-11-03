import { z } from 'zod';
import { itemFrontmatterSchema, type ItemFrontmatter } from '../shared/schemas';

const contentSchema = z.looseObject({ body: z.string() });

export type ParsedItemRequest =
  { ok: true; frontmatter: ItemFrontmatter; body: string } | { ok: false; message: string };

/** Validates a `PUT /api/items/:id` body: the item's frontmatter fields plus its `body`. */
export function parseItemRequest(text: string): ParsedItemRequest {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
  const content = contentSchema.safeParse(json);
  if (!content.success) return { ok: false, message: z.prettifyError(content.error) };
  const { body, ...fields } = content.data;
  const frontmatter = itemFrontmatterSchema.safeParse(fields);
  if (!frontmatter.success) return { ok: false, message: z.prettifyError(frontmatter.error) };
  return { ok: true, frontmatter: frontmatter.data, body };
}
