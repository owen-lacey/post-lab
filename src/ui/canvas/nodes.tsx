import { Link2 } from 'lucide-react';
import { fileUrl } from '@/lib/files';
import { cn } from '@/lib/utils';
import { DEFAULT_ALIGN, DEFAULT_COLOR, DEFAULT_SIZE } from '../../shared/palette';
import { CentreHandles, ItemText } from './node-parts';
import type { ItemNodeProps, ItemOf } from './to-flow';
import { ALIGN_CLASSES, COLOR_CLASSES, SIZE_CLASSES } from './tokens';

export function NoteNode({ data: { item } }: ItemNodeProps<'note'>) {
  const color = COLOR_CLASSES[item.color ?? DEFAULT_COLOR.note];
  return (
    <div
      className={cn(
        'size-full overflow-hidden rounded-md border p-3 text-foreground shadow-sm',
        color.fill,
        color.border,
        SIZE_CLASSES[item.size ?? DEFAULT_SIZE],
        ALIGN_CLASSES[item.align ?? DEFAULT_ALIGN.note],
      )}
    >
      <CentreHandles />
      <ItemText body={item.body} />
    </div>
  );
}

export function TextNode({ data: { item } }: ItemNodeProps<'text'>) {
  return (
    <div
      className={cn(
        'size-full overflow-hidden',
        COLOR_CLASSES[item.color ?? DEFAULT_COLOR.text].text,
        SIZE_CLASSES[item.size ?? DEFAULT_SIZE],
        ALIGN_CLASSES[item.align ?? DEFAULT_ALIGN.text],
      )}
    >
      <CentreHandles />
      <ItemText body={item.body} />
    </div>
  );
}

function ShapeOutline({ shape }: { shape: ItemOf<'shape'>['shape'] }) {
  switch (shape) {
    case 'rectangle':
      return <rect x="1" y="1" width="98" height="98" rx="3" vectorEffect="non-scaling-stroke" />;
    case 'ellipse':
      return <ellipse cx="50" cy="50" rx="49" ry="49" vectorEffect="non-scaling-stroke" />;
    case 'diamond':
      return <polygon points="50,1 99,50 50,99 1,50" vectorEffect="non-scaling-stroke" />;
  }
}

export function ShapeNode({ data: { item } }: ItemNodeProps<'shape'>) {
  const color = COLOR_CLASSES[item.color ?? DEFAULT_COLOR.shape];
  return (
    <div className="relative size-full text-foreground">
      <CentreHandles />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={cn('absolute inset-0 size-full stroke-2', color.svg)}
      >
        <ShapeOutline shape={item.shape} />
      </svg>
      <div
        className={cn(
          'absolute inset-0 flex flex-col justify-center overflow-hidden',
          item.shape === 'diamond' ? 'px-[22%] py-[18%]' : 'p-3',
          SIZE_CLASSES[item.size ?? DEFAULT_SIZE],
          ALIGN_CLASSES[item.align ?? DEFAULT_ALIGN.shape],
        )}
      >
        <ItemText body={item.body} />
      </div>
    </div>
  );
}

export function FrameNode({ data: { item } }: ItemNodeProps<'frame'>) {
  const color = COLOR_CLASSES[item.color ?? DEFAULT_COLOR.frame];
  return (
    <div className={cn('relative size-full rounded-lg border-2', color.fill, color.border)}>
      <CentreHandles />
      <p
        className={cn('absolute -top-7 left-0 max-w-full truncate text-sm font-medium', color.text)}
      >
        {item.body.trim()}
      </p>
    </div>
  );
}

export function ImageNode({ data: { item } }: ItemNodeProps<'image'>) {
  const caption = item.body.trim();
  return (
    <figure className="flex size-full flex-col gap-1">
      <CentreHandles />
      <img
        src={fileUrl(item.src)}
        alt={caption}
        draggable={false}
        className="min-h-0 flex-1 rounded-md object-contain"
      />
      {caption !== '' && (
        <figcaption className="truncate text-xs text-muted-foreground">{caption}</figcaption>
      )}
    </figure>
  );
}

export function LinkNode({ data: { item } }: ItemNodeProps<'link'>) {
  const title = item.preview?.title ?? new URL(item.url).hostname;
  return (
    <div className="flex size-full flex-col gap-1 overflow-hidden rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
      <CentreHandles />
      <p className="flex items-center gap-2 font-medium">
        <Link2 className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{title}</span>
      </p>
      {item.preview?.description !== undefined && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.preview.description}</p>
      )}
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="pointer-events-auto truncate text-xs text-primary underline-offset-4 hover:underline"
      >
        {item.url}
      </a>
      <ItemText body={item.body} className="text-sm" />
    </div>
  );
}
