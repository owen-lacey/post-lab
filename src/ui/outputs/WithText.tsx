import type { ReactNode } from 'react';
import { OutputError } from './OutputError';
import { useFileText } from './use-file-text';

/** Renders a text file's contents once fetched, or why it could not be fetched. */
export function WithText({
  url,
  children,
}: {
  url: string;
  children: (text: string) => ReactNode;
}) {
  const file = useFileText(url);
  switch (file.status) {
    case 'loading':
      return <p className="text-xs text-muted-foreground">Loading…</p>;
    case 'error':
      return <OutputError message={file.message} />;
    case 'ready':
      return children(file.text);
  }
}
