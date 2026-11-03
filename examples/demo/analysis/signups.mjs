// Signups per plan as a CSV, and a Vega-Lite chart that reads it with a relative data.url.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readSignups } from './signups-data.mjs';

const out = process.env.POST_LAB_OUT;
const rows = readSignups();

const csv = ['month,plan,signups', ...rows.map((row) => `${row.month},${row.plan},${row.signups}`)];
writeFileSync(join(out, 'signups.csv'), `${csv.join('\n')}\n`);

const spec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  data: { url: 'signups.csv' },
  width: 520,
  height: 240,
  mark: { type: 'line', point: true },
  encoding: {
    x: { field: 'month', type: 'temporal', timeUnit: 'yearmonth', title: 'Month' },
    y: { field: 'signups', type: 'quantitative', title: 'Signups' },
    color: { field: 'plan', type: 'nominal', title: 'Plan' },
  },
};
writeFileSync(join(out, 'signups.vl.json'), `${JSON.stringify(spec, null, 2)}\n`);
