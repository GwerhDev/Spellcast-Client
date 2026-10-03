import { useCallback, useEffect, useRef, useState } from 'react';

// A selection box dragged with the mouse across a list, as in a file manager: it starts on
// the list's empty space (not on an item), and every item it touches is reported as it
// grows. A press there that doesn't drag is a click on the empty space. Touch is left alone
// (a finger there scrolls the page).

// How far the pointer moves before a press becomes a box (a click wobbles a little).
const DRAG_THRESHOLD_PX = 4;

export interface MarqueeBox { left: number; top: number; width: number; height: number }

interface Options {
  // The list's items, and each one's id: its `data-spell-id`-style attribute.
  itemSelector: string;
  idOf: (el: Element) => string | null;
  // The box began; `additive` when Ctrl/⌘ or Shift was held (add to what's selected).
  onStart: (additive: boolean) => void;
  // The items the box touches now.
  onChange: (hit: string[]) => void;
  // A press on the empty space that wasn't dragged.
  onEmptyClick: (additive: boolean) => void;
}

export function useMarqueeSelect(containerRef: React.RefObject<HTMLElement | null>, options: Options) {
  const [box, setBox] = useState<MarqueeBox | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container || e.pointerType !== 'mouse' || e.button !== 0) return;
    const target = e.target as Element;
    // On an item, a button or a field: theirs, not the box's.
    if (target.closest(`${optionsRef.current.itemSelector}, button, a, input, textarea, select`)) return;
    // No text selection while the box is drawn.
    e.preventDefault();
    const additive = e.ctrlKey || e.metaKey || e.shiftKey;
    // The start point in the container's own space, so it stays put if the page scrolls.
    const at = (x: number, y: number) => {
      const r = container.getBoundingClientRect();
      return { x: x - r.left, y: y - r.top };
    };
    const start = at(e.clientX, e.clientY);
    let started = false;

    const move = (ev: PointerEvent) => {
      const now = at(ev.clientX, ev.clientY);
      if (!started) {
        if (Math.hypot(now.x - start.x, now.y - start.y) < DRAG_THRESHOLD_PX) return;
        started = true;
        optionsRef.current.onStart(additive);
      }
      const rect = { left: Math.min(start.x, now.x), top: Math.min(start.y, now.y), width: Math.abs(now.x - start.x), height: Math.abs(now.y - start.y) };
      setBox(rect);
      const c = container.getBoundingClientRect();
      const hit: string[] = [];
      for (const el of container.querySelectorAll(optionsRef.current.itemSelector)) {
        const r = el.getBoundingClientRect();
        const x = r.left - c.left, y = r.top - c.top;
        if (x < rect.left + rect.width && x + r.width > rect.left && y < rect.top + rect.height && y + r.height > rect.top) {
          const id = optionsRef.current.idOf(el);
          if (id) hit.push(id);
        }
      }
      optionsRef.current.onChange(hit);
    };
    const up = () => {
      if (!started) optionsRef.current.onEmptyClick(additive);
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cleanup);
      setBox(null);
      cleanupRef.current = null;
    };
    cleanupRef.current?.();
    cleanupRef.current = cleanup;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cleanup);
  }, [containerRef]);

  return { box, onPointerDown };
}
