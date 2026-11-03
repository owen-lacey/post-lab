import { ExternalLink } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { outputFolderUrl, outputUrl } from '@/lib/files';
import type { OutputFile } from '../../shared/board';
import { rendererFor } from './renderer-for';
import { WithText } from './WithText';

const TableOutput = lazy(() => import('./TableOutput'));
const VegaOutput = lazy(() => import('./VegaOutput'));
const MarkdownOutput = lazy(() => import('./MarkdownOutput'));

function OutputBody({ cellId, file }: { cellId: string; file: OutputFile }) {
  const url = outputUrl(cellId, file);
  const baseUrl = outputFolderUrl(cellId);
  switch (rendererFor(file.name)) {
    case 'image':
      return <img src={url} alt={file.name} className="max-w-full rounded-md" />;
    case 'csv':
      return <WithText url={url}>{(text) => <TableOutput text={text} format="csv" />}</WithText>;
    case 'json':
      return <WithText url={url}>{(text) => <TableOutput text={text} format="json" />}</WithText>;
    case 'vega-lite':
      return (
        <WithText url={url}>{(text) => <VegaOutput text={text} baseUrl={baseUrl} />}</WithText>
      );
    case 'html':
      // allow-scripts only: the page gets an opaque origin, so it cannot reach post-lab's API.
      return (
        <iframe
          src={url}
          title={file.name}
          sandbox="allow-scripts"
          className="h-96 w-full rounded-md border"
        />
      );
    case 'markdown':
      return (
        <WithText url={url}>{(text) => <MarkdownOutput text={text} baseUrl={baseUrl} />}</WithText>
      );
    case 'stdout':
      return (
        <WithText url={url}>
          {(text) => (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{text}</pre>
          )}
        </WithText>
      );
    case 'link':
      return null;
  }
}

/** Every file a cell wrote, sorted by name, each rendered by its extension (D12). */
export function OutputList({ cellId, files }: { cellId: string; files: OutputFile[] }) {
  return (
    <div className="flex flex-col gap-4">
      {files.map((file) => (
        <section key={file.name} className="flex flex-col gap-1.5">
          <a
            href={outputUrl(cellId, file)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 self-start font-mono text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {file.name}
            <ExternalLink className="size-3" />
          </a>
          <Suspense fallback={<p className="text-xs text-muted-foreground">Loading…</p>}>
            <OutputBody cellId={cellId} file={file} />
          </Suspense>
        </section>
      ))}
    </div>
  );
}
