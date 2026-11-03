import { readFileSync } from 'node:fs';

/** Rows of analysis/data/signups.csv as { month, plan, signups }. */
export function readSignups() {
  const text = readFileSync(new URL('./data/signups.csv', import.meta.url), 'utf8');
  const [, ...lines] = text.trim().split('\n');
  return lines.map((line) => {
    const [month, plan, signups] = line.split(',');
    return { month, plan, signups: Number(signups) };
  });
}
