import type { ComponentProps } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const plugins = [remarkGfm];

/** Links open outside post-lab, which is a single-page canvas. */
function ExternalLink(props: ComponentProps<'a'>) {
  return <a {...props} target="_blank" rel="noreferrer" />;
}

const components = { a: ExternalLink };

/** A `.md` output. Relative links and images resolve against the cell's output folder. */
export default function MarkdownOutput({ text, baseUrl }: { text: string; baseUrl: string }) {
  const base = new URL(baseUrl, window.location.origin);
  const urlTransform = (url: string) => {
    const safe = defaultUrlTransform(url);
    return safe === '' ? '' : new URL(safe, base).href;
  };
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <Markdown remarkPlugins={plugins} components={components} urlTransform={urlTransform}>
        {text}
      </Markdown>
    </div>
  );
}
