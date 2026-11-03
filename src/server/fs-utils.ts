export function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/** Code-point order, so listings are the same on every machine and locale. */
export function compare(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
