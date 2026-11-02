#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import open from 'open';
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

async function main(): Promise<void> {
  const { values } = parseArgs({
    allowNegative: true,
    options: {
      port: { type: 'string', default: String(DEFAULT_PORT) },
      open: { type: 'boolean', default: true },
    },
  });
  const port = parsePort(values.port);
  const server = await startServer({
    hostRoot: process.cwd(),
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
