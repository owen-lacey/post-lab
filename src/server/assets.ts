import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import writeFileAtomic from 'write-file-atomic';
import { BOARD_DIR } from '../shared/board';

/** Saves an uploaded image as `assets/<name>` and returns its `src`. */
export async function saveAsset(hostRoot: string, name: string, data: Buffer): Promise<string> {
  const assetsDir = join(hostRoot, BOARD_DIR, 'assets');
  await mkdir(assetsDir, { recursive: true });
  await writeFileAtomic(join(assetsDir, name), data);
  return `assets/${name}`;
}
