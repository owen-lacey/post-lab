import { useEffect, useState } from 'react';
import type { Pen } from './DrawLayer';

/** The draw tool: whether it is on (Escape turns it off) and the pen it draws with. */
export function useDrawing() {
  const [drawing, setDrawing] = useState(false);
  const [pen, setPen] = useState<Pen>({ color: 'gray', size: 'm' });

  useEffect(() => {
    if (!drawing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawing(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawing]);

  return { drawing, setDrawing, pen, setPen };
}
