import { unlink, writeFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { watch, type FSWatcher } from 'chokidar';
import writeFileAtomic from 'write-file-atomic';
import { BOARD_DIR, type Board, type BoardEvent } from '../shared/board';
import { decodeItem, serializeItemFile } from '../shared/item-file';
import type { Item, ItemFrontmatter } from '../shared/schemas';
import { loadBoard } from './board';
import { diffBoards } from './board-diff';
import { isMissing } from './fs-utils';

/** How long the watcher waits for a burst of file events to settle before re-reading the board. */
const FLUSH_DELAY_MS = 50;

/** How long to wait for the watcher to report the check file before writing it again. */
const WATCH_CHECK_RETRY_MS = 100;

/** Written and removed once at start-up to confirm the watcher is live; never part of the board. */
const WATCH_CHECK_FILE = '.watch-check';

export type BoardListener = (event: BoardEvent) => void;

/** The board as last read from disk or saved by the UI, kept current by a file watcher (D8). */
export interface BoardStore {
  board: () => Board;
  /**
   * Calls the listener for every change found on disk or made by `amendItem`; returns a function
   * that unsubscribes.
   */
  subscribe: (listener: BoardListener) => () => void;
  /** Writes an item file. The UI already shows the item, so no event echoes it back. */
  putItem: (id: string, frontmatter: ItemFrontmatter, body: string) => Promise<void>;
  /**
   * A change post-lab itself makes to an item: `amend` gets the item as it is now and returns it
   * changed, or undefined to leave it alone. The file is written and subscribers are told.
   */
  amendItem: (id: string, amend: (item: Item) => Item | undefined) => Promise<void>;
  /** Deletes an item file; false when there was no such file. */
  deleteItem: (id: string) => Promise<boolean>;
  close: () => Promise<void>;
}

function withoutItem(board: Board, id: string): Board {
  return { ...board, items: board.items.filter((item) => item.id !== id) };
}

function withItem(board: Board, item: Item): Board {
  const index = board.items.findIndex((existing) => existing.id === item.id);
  if (index === -1) return { ...board, items: [...board.items, item] };
  return { ...board, items: board.items.with(index, item) };
}

/** The item exactly as reading `text` back from disk produces it. */
function itemFromText(id: string, text: string): Item {
  const decoded = decodeItem(text);
  if (!decoded.ok) throw new Error(`Serialized item ${id} does not decode: ${decoded.message}`);
  return { ...decoded.frontmatter, id, body: decoded.body };
}

/** Runs tasks one at a time, in the order they were queued. */
function createQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

/**
 * Resolves once the watcher reports a change to `checkFile`, then removes the file. macOS
 * FSEvents starts its stream asynchronously and drops changes made before it is live, even after
 * chokidar's `ready`, so the file is rewritten until the watcher sees it.
 */
async function confirmWatching(watcher: FSWatcher, checkFile: string): Promise<void> {
  const reported = new Promise<true>((resolve) => {
    const onEvent = (_event: string, path: string) => {
      if (path !== checkFile) return;
      watcher.off('all', onEvent);
      resolve(true);
    };
    watcher.on('all', onEvent);
  });
  for (let attempt = 1; ; attempt++) {
    await writeFile(checkFile, `${String(attempt)}\n`);
    if (await Promise.race([reported, delay(WATCH_CHECK_RETRY_MS, false)])) break;
  }
  await unlink(checkFile);
}

/**
 * Loads the board and watches `.post-lab/`, resolving once every later change will be seen.
 * After any file event the whole board is re-read from disk (the event type is not trusted) and
 * the differences are sent to subscribers. Saves update the in-memory board before writing, so
 * the watcher finds nothing to echo.
 */
export async function openBoardStore(hostRoot: string): Promise<BoardStore> {
  const boardDir = join(hostRoot, BOARD_DIR);
  const assetsDir = join(boardDir, 'assets');
  const guide = join(boardDir, 'README.md');
  const checkFile = join(boardDir, WATCH_CHECK_FILE);
  const listeners = new Set<BoardListener>();
  const exclusive = createQueue();
  let timer: NodeJS.Timeout | undefined;

  const watcher = watch(boardDir, {
    ignoreInitial: true,
    ignored: (path) => path === guide || path === assetsDir || path.startsWith(assetsDir + sep),
  });
  await new Promise<void>((resolve) => watcher.once('ready', resolve));
  await confirmWatching(watcher, checkFile);
  let snapshot: Board;

  async function flush(): Promise<void> {
    const next = await loadBoard(hostRoot);
    const events = diffBoards(snapshot, next);
    snapshot = next;
    for (const event of events) publish(event);
  }

  function scheduleFlush(): void {
    clearTimeout(timer);
    timer = setTimeout(() => {
      exclusive(flush).catch((error: unknown) => {
        console.error('post-lab: could not re-read the board:', error);
      });
    }, FLUSH_DELAY_MS);
  }

  watcher.on('all', (_event, path) => {
    if (path !== checkFile) scheduleFlush();
  });
  watcher.on('error', (error) => {
    console.error('post-lab: file watcher failed:', error);
  });
  // Queued, so changes seen while it reads are re-read after it.
  snapshot = await exclusive(() => loadBoard(hostRoot));

  const itemFile = (id: string) => join(boardDir, 'items', `${id}.md`);

  /** Puts the item into the store, in the form a re-read produces, then writes its file. */
  async function writeItem(id: string, frontmatter: ItemFrontmatter, body: string): Promise<Item> {
    const text = serializeItemFile(frontmatter, body);
    const item = itemFromText(id, text);
    snapshot = withItem(snapshot, item);
    await writeFileAtomic(itemFile(id), text);
    return item;
  }

  function publish(event: BoardEvent): void {
    for (const listener of listeners) listener(event);
  }

  return {
    board: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    putItem: (id, frontmatter, body) =>
      exclusive(async () => {
        await writeItem(id, frontmatter, body);
      }),
    amendItem: (id, amend) =>
      exclusive(async () => {
        const current = snapshot.items.find((item) => item.id === id);
        const amended = current === undefined ? undefined : amend(current);
        if (amended === undefined) return;
        // The serializer keeps schema keys only, so `id` and `body` stay out of the frontmatter.
        publish({ type: 'item', item: await writeItem(id, amended, amended.body) });
      }),
    deleteItem: (id) =>
      exclusive(async () => {
        snapshot = withoutItem(snapshot, id);
        try {
          await unlink(itemFile(id));
          return true;
        } catch (error) {
          if (isMissing(error)) return false;
          throw error;
        }
      }),
    close: async () => {
      clearTimeout(timer);
      listeners.clear();
      await watcher.close();
      await exclusive(() => Promise.resolve());
    },
  };
}
