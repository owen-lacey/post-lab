import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import writeFileAtomic from 'write-file-atomic';
import { BOARD_DIR } from '../shared/board';
import { renderGuide } from './guide';

/** Whether the host repo already has a board folder. */
export async function boardExists(hostRoot: string): Promise<boolean> {
  try {
    return (await stat(join(hostRoot, BOARD_DIR))).isDirectory();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}

/** Starts an empty board in the host repo. */
export async function createBoard(hostRoot: string): Promise<void> {
  await mkdir(join(hostRoot, BOARD_DIR, 'items'), { recursive: true });
}

/** Rewrites the agent guide, `.post-lab/README.md` (D11). */
export async function writeGuide(hostRoot: string): Promise<void> {
  await writeFileAtomic(join(hostRoot, BOARD_DIR, 'README.md'), renderGuide());
}
