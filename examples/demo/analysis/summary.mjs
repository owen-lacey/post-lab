// Signups per month as a JSON table, a markdown summary, and a plain text file (shown as a link).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readSignups } from './signups-data.mjs';

const out = process.env.POST_LAB_OUT;
const rows = readSignups();

const months = [...new Set(rows.map((row) => row.month))].map((month) => {
  const free = rows.find((row) => row.month === month && row.plan === 'free').signups;
  const pro = rows.find((row) => row.month === month && row.plan === 'pro').signups;
  return {
    month,
    free,
    pro,
    total: free + pro,
    pro_share: Number((pro / (free + pro)).toFixed(3)),
  };
});
writeFileSync(join(out, 'cohorts.json'), `${JSON.stringify(months, null, 2)}\n`);

const total = (plan) =>
  rows.filter((row) => row.plan === plan).reduce((sum, row) => sum + row.signups, 0);
const best = months.reduce((a, b) => (b.total > a.total ? b : a));
const summary = `# Signups in 2026

| Plan | Signups |
|---|---:|
| Free | ${total('free')} |
| Pro | ${total('pro')} |

Busiest month: **${best.month}** with ${best.total} signups. See [cohorts.json](cohorts.json) for every month.
`;
writeFileSync(join(out, 'summary.md'), summary);
writeFileSync(join(out, 'notes.txt'), 'Pro share is pro / (free + pro), rounded to 3 places.\n');

console.log(`${months.length} months, ${total('free') + total('pro')} signups`);
