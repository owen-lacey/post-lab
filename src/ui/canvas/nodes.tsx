import { Link2 } from 'lucide-react';
import { fileUrl } from '@/lib/files';
import { cn } from '@/lib/utils';
import { DEFAULT_ALIGN, DEFAULT_COLOR, DEFAULT_SIZE } from '../../shared/palette';
import { EditableText, ItemHandles, ItemResizer } from './node-parts';
import type { ItemNodeProps, ItemOf } from './to-flow';
import { ALIGN_CLASSES, COLOR_CLASSES, SIZE_CLASSES } from './tokens';

export function NoteNode({ data: { item }, selected }: ItemNodeProps<'note'>) {
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
      <ItemHandles />
      <ItemResizer item={item} selected={selected} />
      <EditableText item={item} editorClassName="size-full resize-none" />
    </div>
  );
}

export function TextNode({ data: { item }, selected }: ItemNodeProps<'text'>) {
  return (
    <div
      className={cn(
        'size-full overflow-hidden',
        COLOR_CLASSES[item.color ?? DEFAULT_COLOR.text].text,
        SIZE_CLASSES[item.size ?? DEFAULT_SIZE],
        ALIGN_CLASSES[item.align ?? DEFAULT_ALIGN.text],
      )}
    >
      <ItemHandles />
      <ItemResizer item={item} selected={selected} />
      <EditableText item={item} editorClassName="size-full resize-none" />
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

export function ShapeNode({ data: { item }, selected }: ItemNodeProps<'shape'>) {
  const color = COLOR_CLASSES[item.color ?? DEFAULT_COLOR.shape];
  return (
    <div className="relative size-full text-foreground">
      <ItemHandles />
      <ItemResizer item={item} selected={selected} />
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
        <EditableText item={item} editorClassName="size-full resize-none" />
      </div>
    </div>
  );
}

export function FrameNode({ data: { item }, selected }: ItemNodeProps<'frame'>) {
  const color = COLOR_CLASSES[item.color ?? DEFAULT_COLOR.frame];
  return (
    <div className={cn('relative size-full rounded-lg border-2', color.fill, color.border)}>
      <ItemHandles />
      <ItemResizer item={item} selected={selected} />
      <div className="absolute -top-8 left-0 max-w-full">
        <EditableText
          item={item}
          singleLine
          className={cn('truncate pt-1 text-sm font-medium whitespace-pre', color.text)}
        />
      </div>
    </div>
  );
}

export function ImageNode({ data: { item }, selected }: ItemNodeProps<'image'>) {
  const caption = item.body.trim();
  return (
    <figure className="flex size-full flex-col gap-1">
      <ItemHandles />
      <ItemResizer item={item} selected={selected} />
      <img
        src={fileUrl(item.src)}
        alt={caption}
        draggable={false}
        className="min-h-0 flex-1 rounded-md object-contain"
      />
      <figcaption className="text-xs text-muted-foreground">
        <EditableText item={item} singleLine className="truncate whitespace-pre" />
      </figcaption>
    </figure>
  );
}

export function LinkNode({ data: { item }, selected }: ItemNodeProps<'link'>) {
  const title = item.preview?.title ?? new URL(item.url).hostname;
  return (
    <div className="flex size-full flex-col gap-1 overflow-hidden rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
      <ItemHandles />
      <ItemResizer item={item} selected={selected} />
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
        className="nodrag truncate text-xs text-primary underline-offset-4 hover:underline"
      >
        {item.url}
      </a>
      <EditableText item={item} className="text-sm" editorClassName="min-h-12 resize-none" />
    </div>
  );
}
