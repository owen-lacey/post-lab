import type { OutputFile } from '../../shared/board';

const FILES = '/api/files';

/** URL for a path inside `.post-lab/` (an image `src`), one encoded segment at a time. */
export function fileUrl(path: string): string {
  return `${FILES}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

/** URL of a cell's output folder, ending in `/`, for resolving relative links in outputs. */
export function outputFolderUrl(cellId: string): string {
  return `${FILES}/outputs/${cellId}/`;
}

/** URL of one output file; the version changes on every run, so a re-run is never cached. */
export function outputUrl(cellId: string, file: OutputFile): string {
  return `${outputFolderUrl(cellId)}${encodeURIComponent(file.name)}?v=${String(file.version)}`;
}
