import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Board, RunResult } from '../shared/board';
import { startServer, type RunningServer } from './start';
import { freePort, makeHost, send } from './test-helpers';

const cell = (command: string, extra = '') =>
  `---\ntype: cell\nx: 0\ny: 0\nw: 100\nh: 100\ncommand: ${command}\n${extra}---\n`;

const CELLS = {
  write: cell(`'echo hello > "$POST_LAB_OUT/out.txt"'`),
  stdout: cell(`'printf "a\\nb\\n\\n"'`),
  quiet: cell('"true"'),
  cwd: cell(`'pwd > "$POST_LAB_OUT/cwd.txt"'`, 'cwd: analysis\n'),
  fails: cell(`'echo broken >&2; exit 3'`),
  nocwd: cell('"true"', 'cwd: missing\n'),
  slow: cell('sleep 0.3'),
};
const IDS: Record<keyof typeof CELLS, string> = {
  write: 'ce110001',
  stdout: 'ce110002',
  quiet: 'ce110003',
  cwd: 'ce110004',
  fails: 'ce110005',
  nocwd: 'ce110006',
  slow: 'ce110007',
};

describe('cells', () => {
  let port: number;
  let server: RunningServer;
  let hostRoot: string;

  const outputs = (id: string) => join(hostRoot, '.post-lab/outputs', id);

  const run = async (id: string, origin = `http://127.0.0.1:${String(port)}`) =>
    send(port, `/api/cells/${id}/run`, { method: 'POST', headers: { origin } });

  const runOk = async (id: string): Promise<RunResult> => {
    const reply = await run(id);
    expect(reply.status).toBe(200);
    return JSON.parse(reply.body) as RunResult;
  };

  beforeEach(async () => {
    port = await freePort();
    const files: Record<string, string> = {
      '.post-lab/items/n0te0001.md': '---\ntype: note\nx: 0\ny: 0\nw: 10\nh: 10\n---\n',
      'analysis/.keep': '',
    };
    for (const [name, text] of Object.entries(CELLS)) {
      files[`.post-lab/items/${IDS[name as keyof typeof CELLS]}.md`] = text;
    }
    hostRoot = await realpath(await makeHost(files));
    server = await startServer({ hostRoot, port, publicPort: port });
  });

  afterEach(async () => {
    await server.close();
  });

  it('runs with $POST_LAB_OUT set to an emptied outputs folder', async () => {
    const result = await runOk(IDS.write);
    expect(result).toEqual({ ok: true, exitCode: 0, stderr: '' });
    expect(await readFile(join(outputs(IDS.write), 'out.txt'), 'utf8')).toBe('hello\n');

    await writeFile(join(outputs(IDS.write), 'stale.txt'), 'old');
    await runOk(IDS.write);
    await expect(stat(join(outputs(IDS.write), 'stale.txt'))).rejects.toThrow();
  });

  it('saves stdout verbatim as stdout.txt, and only when there is any', async () => {
    await runOk(IDS.stdout);
    expect(await readFile(join(outputs(IDS.stdout), 'stdout.txt'), 'utf8')).toBe('a\nb\n\n');

    await runOk(IDS.quiet);
    await expect(stat(join(outputs(IDS.quiet), 'stdout.txt'))).rejects.toThrow();
  });

  it('runs in cwd, relative to the host root', async () => {
    await runOk(IDS.cwd);
    const cwd = await readFile(join(outputs(IDS.cwd), 'cwd.txt'), 'utf8');
    expect(cwd.trim()).toBe(join(hostRoot, 'analysis'));
  });

  it('reports the exit code and stderr of a failing command', async () => {
    expect(await runOk(IDS.fails)).toEqual({ ok: false, exitCode: 3, stderr: 'broken\n' });
  });

  it('reports a command that could not start, without an exit code', async () => {
    const result = await runOk(IDS.nocwd);
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBeUndefined();
    expect(result.stderr).not.toBe('');
  });

  it('runs only valid cells', async () => {
    expect((await run('n0te0001')).status).toBe(404);
    expect((await run('zzzz9999')).status).toBe(404);
    expect((await run('..%2f..')).status).toBe(404);
  });

  it('refuses a second run while the first is in progress', async () => {
    const first = run(IDS.slow);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect((await run(IDS.slow)).status).toBe(409);
    expect((await first).status).toBe(200);
  });

  it('needs post-lab’s own Origin', async () => {
    expect((await run(IDS.write, 'null')).status).toBe(403);
    expect((await run(IDS.write, 'http://evil.example')).status).toBe(403);
    await expect(stat(outputs(IDS.write))).rejects.toThrow();
  });

  it('lists each cell’s top-level output files by name', async () => {
    await runOk(IDS.write);
    await writeFile(join(outputs(IDS.write), 'B.txt'), '');
    await writeFile(join(outputs(IDS.write), '.hidden'), '');
    await mkdir(join(outputs(IDS.write), 'sub'));
    await runOk(IDS.quiet);
    const board = JSON.parse((await send(port, '/api/board')).body) as Board;
    expect(Object.keys(board.outputs)).toEqual([IDS.write]);
    expect(board.outputs[IDS.write]?.map((file) => file.name)).toEqual(['B.txt', 'out.txt']);
    expect(board.outputs[IDS.write]?.[0]?.version).toBeTypeOf('number');
  });
});
