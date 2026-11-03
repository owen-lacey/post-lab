#!/usr/bin/env node
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import open from 'open';
import { boardExists, createBoard, writeGuide } from './server/host';
import { startServer } from './server/start';

const DEFAULT_PORT = 4870;

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`--port must be a whole number from 1 to 65535, got "${value}".`);
  }
  return port;
}

function isAddressInUse(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EADDRINUSE';
}

async function confirmNewBoard(): Promise<boolean> {
  const prompt = createInterface({ input: stdin, output: stdout });
  // Input that ends without an answer (closed stdin) creates nothing.
  const answer = await new Promise<string | undefined>((resolve) => {
    prompt.once('close', () => {
      resolve(undefined);
    });
    void prompt.question('No board found in this directory, start a new one? (Y/n) ').then(resolve);
  });
  prompt.close();
  return answer !== undefined && /^(y|yes)?$/i.test(answer.trim());
}

/** Makes sure the host repo has a board (asking before creating one) and a current guide. */
async function prepareBoard(hostRoot: string): Promise<boolean> {
  if (!(await boardExists(hostRoot))) {
    if (!(await confirmNewBoard())) return false;
    await createBoard(hostRoot);
  }
  await writeGuide(hostRoot);
  return true;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    allowNegative: true,
    options: {
      port: { type: 'string', default: String(DEFAULT_PORT) },
      open: { type: 'boolean', default: true },
    },
  });
  const port = parsePort(values.port);
  const hostRoot = process.cwd();
  if (!(await prepareBoard(hostRoot))) {
    console.log('No board created.');
    return;
  }
  const server = await startServer({
    hostRoot,
    port,
    publicPort: port,
    uiDir: fileURLToPath(new URL('./ui', import.meta.url)),
  });
  console.log(`post-lab is running at ${server.url}`);
  if (values.open) {
    await open(server.url);
  }
}

main().catch((error: unknown) => {
  if (isAddressInUse(error)) {
    console.error('post-lab: that port is already in use. Pass --port to choose another.');
  } else {
    console.error(`post-lab: ${error instanceof Error ? error.message : String(error)}`);
  }
  process.exit(1);
});
