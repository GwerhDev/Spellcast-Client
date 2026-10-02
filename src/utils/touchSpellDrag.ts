import { SPELL_DRAG_TYPE } from '../config/consts';

// Dragging a spell with a finger. Touch screens don't start a native drag (draggable +
// dragstart/dragover/drop) from a touch, so the drop targets -- the altar, the player's
// bar -- never got one there. Holding a card still for a moment picks it up instead: from
// then on the card follows the finger (the page doesn't scroll), and the same drag events a
// mouse drag fires are fired on whatever is under the finger, carrying the spell's id the
// same way. Every drop target and drag effect works unchanged with either.

// How long a finger rests on a card before it's picked up, and how far it may move in the
// meantime -- further and it's a scroll or a swipe, not a drag.
export const LONG_PRESS_MS = 320;
const MOVE_TOLERANCE_PX = 8;

let dragging = false;
// Whether a spell is being dragged by touch right now (e.g. so a swipe gesture on the
// same finger doesn't also count).
export const isTouchDragging = () => dragging;

type Point = { x: number; y: number };

// What a native drag carries: the spell's id under SPELL_DRAG_TYPE. A real DataTransfer where
// the browser can make one, or a stand-in with what the drop targets read.
const makeDataTransfer = (spellId: string): DataTransfer => {
  try {
    const dt = new DataTransfer();
    dt.setData(SPELL_DRAG_TYPE, spellId);
    dt.effectAllowed = 'copy';
    if (Array.from(dt.types).includes(SPELL_DRAG_TYPE)) return dt;
  } catch { /* no constructible DataTransfer: the stand-in below */ }
  const data: Record<string, string> = { [SPELL_DRAG_TYPE]: spellId };
  return {
    types: [SPELL_DRAG_TYPE],
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    dropEffect: 'copy',
    effectAllowed: 'copy',
    getData: (type: string) => data[type] ?? '',
    setData: (type: string, value: string) => { data[type] = value; },
    clearData: () => {},
    setDragImage: () => {},
  } as DataTransfer;
};

// A drag event as the browser would fire it, at a point, with its data. Where the engine
// won't take the data (or the point) from the event's init, it's set on the event itself.
const fire = (type: string, target: EventTarget, at: Point, dataTransfer: DataTransfer, relatedTarget: EventTarget | null = null): boolean => {
  let event: Event;
  try {
    event = new DragEvent(type, { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, dataTransfer, relatedTarget });
  } catch {
    event = new Event(type, { bubbles: true, cancelable: true });
  }
  const own = (key: string, value: unknown) => Object.defineProperty(event, key, { value, configurable: true });
  if ((event as DragEvent).dataTransfer !== dataTransfer) own('dataTransfer', dataTransfer);
  if ((event as MouseEvent).clientX !== at.x || (event as MouseEvent).clientY !== at.y) { own('clientX', at.x); own('clientY', at.y); }
  if ((event as MouseEvent).relatedTarget !== relatedTarget) own('relatedTarget', relatedTarget);
  target.dispatchEvent(event);
  return event.defaultPrevented;
};

// The picked-up card under the finger: a copy of it, so the card itself can show as the
// empty place it left, as it does in a mouse drag.
const makeGhost = (source: HTMLElement, at: Point) => {
  const box = source.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  const offset = { x: at.x - box.left, y: at.y - box.top };
  Object.assign(ghost.style, {
    position: 'fixed', left: '0', top: '0', margin: '0', width: `${box.width}px`, height: `${box.height}px`,
    pointerEvents: 'none', zIndex: '10000', opacity: '0.92', transition: 'none',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)', willChange: 'transform',
  });
  ghost.removeAttribute('data-testid');
  ghost.setAttribute('aria-hidden', 'true');
  const place = (p: Point) => { ghost.style.transform = `translate(${p.x - offset.x}px, ${p.y - offset.y}px) scale(1.06)`; };
  place(at);
  document.body.appendChild(ghost);
  return { place, remove: () => ghost.remove() };
};

interface TouchDragHooks {
  // The card was picked up (as a mouse drag's dragstart).
  onStart: () => void;
}

// Waits on a touch that started on `source` for the long press that picks it up, then drags
// the spell until the finger lifts. Returns a function that cancels it (e.g. on unmount).
export const beginTouchSpellDrag = (start: Point, source: HTMLElement, spellId: string, { onStart }: TouchDragHooks): (() => void) => {
  let picked = false;
  let ghost: ReturnType<typeof makeGhost> | null = null;
  let dataTransfer: DataTransfer | null = null;
  let target: Element | null = null;
  let accepted = false;
  let last = start;

  const over = (at: Point) => {
    const el = document.elementFromPoint(at.x, at.y);
    if (el !== target) {
      if (target) fire('dragleave', target, at, dataTransfer!, el);
      if (el) fire('dragenter', el, at, dataTransfer!, target);
      target = el;
    }
    // As with a native drag, a target that takes the drop says so by cancelling dragover.
    accepted = el ? fire('dragover', el, at, dataTransfer!) : false;
  };

  const pickUp = () => {
    picked = true;
    dragging = true;
    dataTransfer = makeDataTransfer(spellId);
    navigator.vibrate?.(12);
    ghost = makeGhost(source, start);
    onStart();
    over(start);
  };
  const timer = window.setTimeout(pickUp, LONG_PRESS_MS);

  const handleMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    last = { x: touch.clientX, y: touch.clientY };
    if (!picked) {
      if (Math.hypot(last.x - start.x, last.y - start.y) > MOVE_TOLERANCE_PX) cleanup();
      return;
    }
    // Picked up: the finger moves the card, not the page.
    e.preventDefault();
    ghost?.place(last);
    over(last);
  };

  const handleEnd = (e: TouchEvent) => {
    if (picked) {
      // No click on what's under the finger once it lifts: the drag was the gesture.
      e.preventDefault();
      if (target && accepted && e.type === 'touchend') fire('drop', target, last, dataTransfer!);
      fire('dragend', source, last, dataTransfer!);
      swallowNextClick();
    }
    cleanup();
  };

  // A long press on a phone also asks for the page's own menu (copy, open the image...).
  const handleContextMenu = (e: Event) => e.preventDefault();

  document.addEventListener('touchmove', handleMove, { passive: false });
  document.addEventListener('touchend', handleEnd, { passive: false });
  document.addEventListener('touchcancel', handleEnd, { passive: false });
  document.addEventListener('contextmenu', handleContextMenu);

  function cleanup() {
    window.clearTimeout(timer);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
    document.removeEventListener('touchcancel', handleEnd);
    document.removeEventListener('contextmenu', handleContextMenu);
    ghost?.remove();
    ghost = null;
    picked = false;
    dragging = false;
  }
  return cleanup;
};

// The click a browser may still send after a long touch, right after it ends.
const swallowNextClick = () => {
  const swallow = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };
  window.addEventListener('click', swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 500);
};
