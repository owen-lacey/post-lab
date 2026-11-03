import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { OutputFile } from '../shared/board';
import { compare, isMissing } from './fs-utils';

/** `outputs/<cell-id>/` inside the board folder. */
export function outputDir(boardDir: string, cellId: string): string {
  return join(boardDir, 'outputs', cellId);
}

/** Top-level files a cell wrote, by name. Subfolders and dotfiles are not listed. */
async function listCellOutputs(dir: string): Promise<OutputFile[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
  const files = entries.filter((entry) => entry.isFile() && !entry.name.startsWith('.'));
  const listed = await Promise.all(
    files.map(async ({ name }) => ({
      name,
      version: Math.round((await stat(join(dir, name))).mtimeMs),
    })),
  );
  return listed.sort((a, b) => compare(a.name, b.name));
}

/** Output files for each of the given cells; cells with no outputs are left out. */
export async function listOutputs(
  boardDir: string,
  cellIds: string[],
): Promise<Record<string, OutputFile[]>> {
  const outputs: Record<string, OutputFile[]> = {};
  for (const id of cellIds) {
    const files = await listCellOutputs(outputDir(boardDir, id));
    if (files.length > 0) outputs[id] = files;
  }
  return outputs;
}
