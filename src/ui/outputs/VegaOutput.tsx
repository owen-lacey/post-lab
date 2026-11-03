import { useEffect, useMemo, useRef, useState } from 'react';
import embed, { type VisualizationSpec } from 'vega-embed';
import { errorMessage } from '@/lib/api';
import { OutputError } from './OutputError';

type Parsed = { ok: true; spec: VisualizationSpec } | { ok: false; message: string };

function parseSpec(text: string): Parsed {
  try {
    return { ok: true, spec: JSON.parse(text) as VisualizationSpec };
  } catch (error) {
    return { ok: false, message: `Not valid JSON: ${errorMessage(error)}` };
  }
}

function VegaChart({ spec, baseUrl }: { spec: VisualizationSpec; baseUrl: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<{ spec: VisualizationSpec; message: string }>();

  useEffect(() => {
    const element = container.current;
    if (element === null) return;
    let finalize: (() => void) | undefined;
    let cancelled = false;
    embed(element, spec, { actions: false, loader: { baseURL: baseUrl } }).then(
      (result) => {
        if (cancelled) result.finalize();
        else finalize = result.finalize;
      },
      (reason: unknown) => {
        if (!cancelled) setError({ spec, message: errorMessage(reason) });
      },
    );
    return () => {
      cancelled = true;
      finalize?.();
    };
  }, [spec, baseUrl]);

  return (
    <>
      {error?.spec === spec && <OutputError message={error.message} />}
      <div ref={container} className="max-w-full overflow-x-auto" />
    </>
  );
}

/** A `.vl.json` Vega-Lite chart. Relative `data.url`s resolve against the cell's output folder. */
export default function VegaOutput({ text, baseUrl }: { text: string; baseUrl: string }) {
  const parsed = useMemo(() => parseSpec(text), [text]);
  return parsed.ok ? (
    <VegaChart spec={parsed.spec} baseUrl={baseUrl} />
  ) : (
    <OutputError message={parsed.message} />
  );
}
