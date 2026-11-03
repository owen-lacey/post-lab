export type RendererKind =
  'image' | 'csv' | 'json' | 'vega-lite' | 'html' | 'markdown' | 'stdout' | 'link';

const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i;

const BY_EXTENSION: [RegExp, RendererKind][] = [
  [IMAGE, 'image'],
  [/\.csv$/i, 'csv'],
  [/\.vl\.json$/i, 'vega-lite'], // before .json
  [/\.json$/i, 'json'],
  [/\.html$/i, 'html'],
  [/\.md$/i, 'markdown'],
];

/** How an output file renders, by its name alone (D12). */
export function rendererFor(name: string): RendererKind {
  if (name === 'stdout.txt') return 'stdout';
  return BY_EXTENSION.find(([pattern]) => pattern.test(name))?.[1] ?? 'link';
}
