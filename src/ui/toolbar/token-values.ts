export const SIZE_LABELS = { s: 'S', m: 'M', l: 'L' } as const;

/** The value all entries share, or '' when they differ. */
export function shared<T, V extends string>(entries: T[], value: (entry: T) => V): V | '' {
  const values = new Set(entries.map(value));
  return values.size === 1 ? ([...values][0] ?? '') : '';
}
