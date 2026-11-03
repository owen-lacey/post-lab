import ogs from 'open-graph-scraper';
import type { Item } from '../shared/schemas';
import type { BoardStore } from './store';

type LinkItem = Extract<Item, { type: 'link' }>;
export type LinkPreview = NonNullable<LinkItem['preview']>;

/** How long one page fetch may take. */
const FETCH_TIMEOUT_MS = 10_000;

/** Trimmed text, or undefined when there is none. */
function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}

/** The image URL resolved against the page; only http(s) URLs are kept. */
function imageUrl(value: string | undefined, pageUrl: string): string | undefined {
  if (value === undefined) return undefined;
  const url = URL.parse(value, pageUrl);
  return url !== null && (url.protocol === 'http:' || url.protocol === 'https:')
    ? url.href
    : undefined;
}

/**
 * Fetches a page's Open Graph data. Fields the page lacks are undefined, so they are left out of
 * the item file; a page with none gives an empty preview.
 */
export async function fetchPreview(url: string, signal: AbortSignal): Promise<LinkPreview> {
  const { result } = await ogs({
    url,
    fetchOptions: { signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]) },
  });
  return {
    title: text(result.ogTitle),
    description: text(result.ogDescription),
    image: imageUrl(result.ogImage?.[0]?.url, url),
  };
}

export interface LinkPreviews {
  /** Fetches a preview for a link item that has none, unless one is in flight or has failed. */
  check: (item: Item) => void;
  /** Cancels fetches in flight and waits for them to finish. */
  close: () => Promise<void>;
}

/**
 * Writes an Open Graph preview into each link item that has none, so it is fetched once and
 * committed with the board. A failed fetch writes nothing and is not retried until the next
 * launch. Checks every link on the board now and every item that later changes on disk.
 */
export function createLinkPreviews(store: BoardStore): LinkPreviews {
  const closing = new AbortController();
  const inFlight = new Map<string, Promise<void>>();
  const failed = new Set<string>();

  async function fetchAndWrite(id: string, url: string): Promise<void> {
    let preview: LinkPreview;
    try {
      preview = await fetchPreview(url, closing.signal);
    } catch (error) {
      if (!closing.signal.aborted) {
        failed.add(`${id} ${url}`);
        console.error(`post-lab: no link preview for ${url}:`, error);
      }
      return;
    }
    // Written into the item as it is now, so an edit made during the fetch is kept.
    await store.amendItem(id, (current) =>
      current.type === 'link' && current.url === url && current.preview === undefined
        ? { ...current, preview }
        : undefined,
    );
  }

  function check(item: Item): void {
    if (item.type !== 'link' || item.preview !== undefined || closing.signal.aborted) return;
    const key = `${item.id} ${item.url}`;
    if (inFlight.has(key) || failed.has(key)) return;
    const run = fetchAndWrite(item.id, item.url)
      .catch((error: unknown) => {
        console.error(`post-lab: could not save the link preview for ${item.url}:`, error);
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, run);
  }

  const unsubscribe = store.subscribe((event) => {
    if (event.type === 'item') check(event.item);
  });
  for (const item of store.board().items) check(item);

  return {
    check,
    close: async () => {
      unsubscribe();
      closing.abort();
      await Promise.all(inFlight.values());
    },
  };
}
