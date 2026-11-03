import { FileCode } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { errorMessage, post } from '@/lib/api';
import { openOutputUrl, outputFolderUrl, outputUrl } from '@/lib/files';
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

/** The file's name; clicking it opens the file in the user's editor. */
function OpenInEditor({ cellId, file }: { cellId: string; file: OutputFile }) {
  const open = () => {
    post(openOutputUrl(cellId, file)).catch((error: unknown) => {
      toast.error(`Could not open ${file.name}`, { description: errorMessage(error) });
    });
  };
  return (
    <button
      type="button"
      title="Open in editor"
      onClick={open}
      className="nodrag flex cursor-pointer items-center gap-1 self-start font-mono text-xs text-muted-foreground underline-offset-4 hover:underline"
    >
      {file.name}
      <FileCode className="size-3" />
    </button>
  );
}

/** Every file a cell wrote, sorted by name, each rendered by its extension (D12). */
export function OutputList({ cellId, files }: { cellId: string; files: OutputFile[] }) {
  return (
    <div className="flex flex-col gap-4">
      {files.map((file) => (
        <section key={file.name} className="flex flex-col gap-1.5">
          <OpenInEditor cellId={cellId} file={file} />
          <Suspense fallback={<p className="text-xs text-muted-foreground">Loading…</p>}>
            <OutputBody cellId={cellId} file={file} />
          </Suspense>
        </section>
      ))}
    </div>
  );
}
