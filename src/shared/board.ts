import type { Item, Strokes } from './schemas';

/** The folder in the host repo that holds the board (D15). */
export const BOARD_DIR = '.post-lab';

/** A file that could not be shown, with what is wrong with it. */
export interface Problem {
  /** Path relative to the host repo root. */
  path: string;
  message: string;
}

/** A file a cell wrote to `outputs/<cell-id>/`. */
export interface OutputFile {
  name: string;
  /** Last modified time in whole milliseconds, so a re-run's file gets a fresh URL. */
  version: number;
}

/** What `GET /api/board` returns. */
export interface Board {
  items: Item[];
  strokes: Strokes;
  problems: Problem[];
  /** Output files per cell ID, sorted by name. */
  outputs: Record<string, OutputFile[]>;
}

/** What `POST /api/cells/:id/run` returns. */
export interface RunResult {
  /** Whether the command ran and exited with code 0. */
  ok: boolean;
  /** Absent when the command could not be started (e.g. its `cwd` is missing). */
  exitCode?: number;
  /** The command's stderr, or why it could not be started. */
  stderr: string;
}
