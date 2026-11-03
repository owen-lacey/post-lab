import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { ITEM_SCHEMAS, itemFrontmatterSchema, type ItemFrontmatter } from './schemas';

/** Opening fence, YAML (absent when empty), closing fence, then the body. */
const ITEM_FILE = /^---\n((?:.*\n)*?)---(?:\n|$)/;

export interface ItemFileParts {
  frontmatter: unknown;
  body: string;
}

export type DecodedItem =
  { ok: true; frontmatter: ItemFrontmatter; body: string } | { ok: false; message: string };

/** Splits an item file at its `---` fences and parses the frontmatter as YAML 1.2 (core schema). */
export function parseItemFile(text: string): ItemFileParts {
  const match = ITEM_FILE.exec(text);
  if (match === null) {
    throw new Error(
      'Item files must start with a `---` line and close the frontmatter with another.',
    );
  }
  return {
    frontmatter: parse(match[1] ?? '', { schema: 'core' }),
    body: text.slice(match[0].length),
  };
}

/** Parses and validates an item file; the message says what is wrong when it is invalid. */
export function decodeItem(text: string): DecodedItem {
  let parts: ItemFileParts;
  try {
    parts = parseItemFile(text);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
  const result = itemFrontmatterSchema.safeParse(parts.frontmatter);
  if (!result.success) {
    return { ok: false, message: z.prettifyError(result.error) };
  }
  return { ok: true, frontmatter: result.data, body: parts.body };
}

/** Writes an item file with frontmatter keys in schema order and the body verbatim. */
export function serializeItemFile(frontmatter: ItemFrontmatter, body: string): string {
  const values: Record<string, unknown> = frontmatter;
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(ITEM_SCHEMAS[frontmatter.type].shape)) {
    if (values[key] !== undefined) ordered[key] = values[key];
  }
  return `---\n${stringify(ordered, { lineWidth: 0 })}---\n${body}`;
}
