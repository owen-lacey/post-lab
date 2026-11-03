import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { execa } from 'execa';
import writeFileAtomic from 'write-file-atomic';
import { BOARD_DIR, type RunResult } from '../shared/board';
import type { Item } from '../shared/schemas';
import { outputDir } from './outputs';

export type CellItem = Extract<Item, { type: 'cell' }>;

export interface CellRunner {
  /** Whether the cell is running now. */
  isRunning: (id: string) => boolean;
  run: (cell: CellItem) => Promise<RunResult>;
}

/** Why the command did not exit normally, when it was never started or was killed. */
function failureText(stderr: string, shortMessage: string | undefined): string {
  return [stderr, shortMessage ?? ''].filter((text) => text !== '').join('\n');
}

/**
 * Runs cells in the host repo (D9): empties `outputs/<cell-id>/`, exposes it as
 * `$POST_LAB_OUT`, runs `command` through the shell in `cwd`, and saves stdout as `stdout.txt`.
 */
export function createCellRunner(hostRoot: string): CellRunner {
  const running = new Set<string>();

  async function execute(cell: CellItem): Promise<RunResult> {
    const outDir = outputDir(join(hostRoot, BOARD_DIR), cell.id);
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });
    const result = await execa(cell.command, {
      shell: true,
      cwd: join(hostRoot, cell.cwd ?? '.'),
      env: { POST_LAB_OUT: outDir },
      stdin: 'ignore',
      stripFinalNewline: false,
      reject: false,
    });
    if (result.stdout !== '') {
      await writeFileAtomic(join(outDir, 'stdout.txt'), result.stdout);
    }
    if (result.exitCode === undefined) {
      return { ok: false, stderr: failureText(result.stderr, result.shortMessage) };
    }
    return { ok: result.exitCode === 0, exitCode: result.exitCode, stderr: result.stderr };
  }

  return {
    isRunning: (id) => running.has(id),
    run: async (cell) => {
      running.add(cell.id);
      try {
        return await execute(cell);
      } finally {
        running.delete(cell.id);
      }
    },
  };
}
