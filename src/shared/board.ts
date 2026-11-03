import type { Item, Strokes } from './schemas';

/** The folder in the host repo that holds the board (D15). */
export const BOARD_DIR = '.post-lab';

/** A file that could not be shown, with what is wrong with it. */
export interface Problem {
  /** Path relative to the host repo root. */
  path: string;
  message: string;
}

/** What `GET /api/board` returns. */
export interface Board {
  items: Item[];
  strokes: Strokes;
  problems: Problem[];
}
