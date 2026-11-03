// Writes an HTML output that tries to call post-lab's API. post-lab shows .html outputs in an
// iframe sandboxed with allow-scripts only, so both requests should be blocked.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const html = `<!doctype html>
<meta charset="utf-8">
<body style="font: 14px sans-serif">
<p>Requests from this page to post-lab:</p>
<ul id="log"></ul>
<script>
  const log = (text) => {
    const item = document.createElement('li');
    item.textContent = text;
    document.getElementById('log').append(item);
  };
  const probe = async (label, init) => {
    try {
      const response = await fetch(label.split(' ')[1], init);
      log(label + ': NOT blocked, HTTP ' + response.status + ' ' + (await response.text()).slice(0, 60));
    } catch (error) {
      log(label + ': blocked (' + error.message + ')');
    }
  };
  probe('POST /api/cells/c3ll0002/run', { method: 'POST' });
  probe('GET /api/board');
</script>
`;
writeFileSync(join(process.env.POST_LAB_OUT, 'probe.html'), html);
