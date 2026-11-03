import { useEffect, useState } from 'react';
import { errorMessage, getText } from '@/lib/api';

export type FileText =
  { status: 'loading' } | { status: 'ready'; text: string } | { status: 'error'; message: string };

/** Fetches a file's text, refetching when the URL (and so the file's version) changes. */
export function useFileText(url: string): FileText {
  const [loaded, setLoaded] = useState<{ url: string; result: FileText }>();

  useEffect(() => {
    const controller = new AbortController();
    getText(url, controller.signal).then(
      (text) => {
        setLoaded({ url, result: { status: 'ready', text } });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setLoaded({ url, result: { status: 'error', message: errorMessage(error) } });
      },
    );
    return () => {
      controller.abort();
    };
  }, [url]);

  return loaded?.url === url ? loaded.result : { status: 'loading' };
}
