// An SVG image output.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64">
  <rect width="240" height="64" rx="12" fill="#4f46e5"/>
  <text x="120" y="40" font-family="sans-serif" font-size="22" fill="#fff" text-anchor="middle">post-lab demo</text>
</svg>
`;
writeFileSync(join(process.env.POST_LAB_OUT, 'badge.svg'), svg);
