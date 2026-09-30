import { useEffect, useRef } from 'react';

// Follows the pointer while something is being dragged, anywhere on the page: dragover is
// the only event that carries its position during a native drag (mousemove doesn't fire).
// At most one call per animation frame, so visuals driven by it can write straight to the
// DOM without re-rendering on every move.
export const useDragPointer = (active: boolean, onMove: (x: number, y: number) => void) => {
  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; });

  useEffect(() => {
    if (!active) return;
    let frame: number | null = null;
    let last: { x: number; y: number } | null = null;
    const handle = (e: DragEvent) => {
      // Some browsers report (0, 0) on the last dragover of a drag; that's not a position.
      if (e.clientX === 0 && e.clientY === 0) return;
      last = { x: e.clientX, y: e.clientY };
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (last) onMoveRef.current(last.x, last.y);
      });
    };
    document.addEventListener('dragover', handle);
    return () => {
      document.removeEventListener('dragover', handle);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [active]);
};
