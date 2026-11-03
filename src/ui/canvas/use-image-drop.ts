import { useReactFlow, useStore, type XYPosition } from '@xyflow/react';
import { useEffect, useEffectEvent, type DragEvent } from 'react';
import { toast } from 'sonner';
import { errorMessage, postFile } from '@/lib/api';
import { newItemId } from '@/lib/ids';
import { imageFiles, imageSize, uploadProblem } from './image-drop';
import { newImage } from './new-item';
import { frameBoxes, placeDropped } from './placement';
import type { ItemNode, PositionedItem } from './to-flow';

/** How far apart several images added at once land. */
const STAGGER = 24;

/** Where focus takes a paste for itself (a text box), rather than the board. */
function isTextTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
  );
}

/** Uploads the image as `assets/<item-id>.<ext>`, then makes its item, sized to the image. */
async function makeImage(file: File, centre: XYPosition): Promise<PositionedItem> {
  const problem = uploadProblem(file);
  if (problem !== undefined) throw new Error(problem);
  const id = newItemId();
  const [{ src }, size] = await Promise.all([
    postFile<{ src: string }>(`/api/assets?id=${id}`, file),
    imageSize(file),
  ]);
  return newImage(id, centre, src, size);
}

/**
 * Images pasted onto the board (centred on the visible canvas) or dropped onto it (centred on
 * the drop point). Each is saved under `assets/` before its item is placed, so no item ever
 * points at a missing file. Returns the canvas's drag-and-drop handlers.
 */
export function useImageDrop(nodes: ItemNode[], onPlace: (item: PositionedItem) => void) {
  const { screenToFlowPosition } = useReactFlow();
  const canvas = useStore((state) => state.domNode);

  const addImages = (files: File[], centre: XYPosition) => {
    const frames = frameBoxes(nodes);
    files.forEach((file, index) => {
      const at = { x: centre.x + index * STAGGER, y: centre.y + index * STAGGER };
      makeImage(file, at).then(
        (item) => {
          onPlace(placeDropped(item, { x: item.x, y: item.y, w: item.w, h: item.h }, frames));
        },
        (error: unknown) => {
          toast.error(`Could not add ${file.name}`, { description: errorMessage(error) });
        },
      );
    });
  };

  const onPaste = useEffectEvent((event: ClipboardEvent) => {
    if (isTextTarget(event.target) || canvas === null) return;
    const files = imageFiles(event.clipboardData?.files ?? []);
    if (files.length === 0) return;
    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    const centre = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    addImages(files, screenToFlowPosition(centre));
  });

  useEffect(() => {
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('paste', onPaste);
    };
  }, []);

  const onDragOver = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    const files = imageFiles(event.dataTransfer.files);
    if (files.length === 0) {
      toast.error('Only images can be dropped on the board', {
        description: 'PNG, JPEG, GIF, WebP or SVG.',
      });
      return;
    }
    addImages(files, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  };

  return { onDragOver, onDrop };
}
