import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isTouchDragging } from '../../../utils/touchSpellDrag';

// The coverflow's row (see Coverflow): its layout, the places in it and which item each one
// shows, and how it's turned -- shared by every way of drawing it (the cards on the page, or
// the books in the home's 3D scene), so they lay out and move exactly the same.

export interface CoverflowLayout {
  // The front row: the centered card and this many on each side, side by side at full size
  // and light. The rest fan out behind its ends, smaller and dimmer, overlapping.
  front: number;
  // How each place away from the center looks: how far out (its center, in card widths),
  // how big, how bright, and how deep its shadow.
  x: number[];
  scale: number[];
  brightness: number[];
  shadow: number[];
}

// With room: three cards in front, the rest fanned out behind, arrows at the sides, and the
// pointer resting over the cards behind moving the row toward them.
export const WIDE: CoverflowLayout = {
  front: 1,
  x: [0, 1.06, 1.92, 2.6],
  scale: [1, 1, 0.86, 0.74],
  brightness: [1, 1, 0.66, 0.46],
  shadow: [0.5, 0.5, 0.25, 0.12],
};
// A narrow row (a phone): one card in front, swiped through, no arrows.
export const COMPACT: CoverflowLayout & { slots: number } = {
  slots: 5,
  front: 0,
  x: [0, 0.6, 1.02],
  scale: [1, 0.82, 0.66],
  brightness: [1, 0.62, 0.42],
  shadow: [0.5, 0.25, 0.12],
};
// The arrows and the gaps beside the row, which the wide layout needs room for too.
const ARROWS_PX = 2 * (32 + 12);
export const AUTO_STEP_MS = 520;
// How far a finger has to travel across the row to turn it.
const SWIPE_PX = 40;

const mod = (n: number, m: number) => ((n % m) + m) % m;

const last = (l: CoverflowLayout) => l.x.length - 1;
// Past the last place (a card coming in from, or going out to, beyond the edge).
const xAt = (l: CoverflowLayout, d: number) => {
  const end = last(l);
  return d <= end ? l.x[d] : l.x[end] + (d - end) * (l.x[end] - l.x[end - 1]);
};
// From the outer edge of the leftmost card to that of the rightmost, in card widths.
export const spanOf = (l: CoverflowLayout, half: number) => 2 * (xAt(l, half) + l.scale[Math.min(half, last(l))] / 2);

// How a card looks at a place (`offset` from the center): where (its center, in card widths
// from the row's), how big, how bright, its shadow, whether it shows at all, and its order
// over the others.
export const placeValues = (l: CoverflowLayout, offset: number) => {
  const d = Math.min(Math.abs(offset), last(l));
  return {
    x: Math.sign(offset) * xAt(l, Math.abs(offset)),
    scale: l.scale[d],
    brightness: l.brightness[d],
    shadow: l.shadow[d],
    opacity: Math.abs(offset) > last(l) ? 0 : 1,
    zIndex: 10 - Math.abs(offset),
  };
};

export interface CoverflowPlace {
  offset: number;
  // The item it shows; past the items, it's an empty place.
  index: number;
  empty: boolean;
  // A card going round the back from one end to the other is a new card there.
  key: string;
  // Behind the front row: a click brings it to the center instead of reaching it.
  behind: boolean;
}

interface UseCoverflowOptions {
  // Each item's own key (what a card is, across places).
  keys: string[];
  // How many places are shown with room for the full row (see Coverflow's `slots`).
  slots: number;
  interactive: boolean;
  // The row's root on the page (measured for room) and how wide one card is right now.
  rootRef: React.RefObject<HTMLElement | null>;
  measureItem: () => number;
}

export const useCoverflow = ({ keys, slots, interactive, rootRef, measureItem }: UseCoverflowOptions) => {
  const count = keys.length;
  // Narrow when the wide row (with its arrows) doesn't fit where the row is -- measured on
  // the row itself, not the screen, so it follows whatever room the page gives it.
  const [compact, setCompact] = useState(false);
  const measureRef = useRef(measureItem);
  useEffect(() => { measureRef.current = measureItem; });
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const width = measureRef.current();
      if (!width) return;
      setCompact(root.clientWidth < width * spanOf(WIDE, Math.floor(slots / 2)) + ARROWS_PX);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [slots, rootRef]);

  const layout = compact ? COMPACT : WIDE;
  const shown = compact ? COMPACT.slots : slots;
  const half = Math.floor(shown / 2);
  const size = Math.max(count, shown);
  // Unwrapped position: it only ever counts up or down, so a card going round the back from
  // one end to the other is a new card there (fading in) instead of sliding across.
  const [pos, setPos] = useState(0);
  // Only the first cards spread out from the center; later ones come in from the edge.
  const spreading = useRef(true);
  // Where the row was last drawn: a card showing up while it stays put is new content in
  // that place (the items arriving, or changing), and fades in right there instead.
  const drawnAt = useRef(pos);
  const turning = drawnAt.current !== pos;
  useEffect(() => { drawnAt.current = pos; }, [pos]);
  const active = mod(pos, size);
  const canMove = interactive && count > 1;

  const step = (dir: 1 | -1) => {
    if (count < 2) return;
    setPos((from) => {
      let next = from + dir;
      // Only the items themselves get to the center, never an empty place.
      while (mod(next, size) >= count) next += dir;
      return next;
    });
  };
  const goTo = (index: number) => {
    const forward = mod(index - active, size);
    setPos(pos + (forward <= size / 2 ? forward : forward - size));
  };

  // Which way the pointer is asking the row to move: toward the end it rests over, past the
  // front row. Measured from the pointer's place against the centered card's width, so it
  // keeps going while the cards change under a still pointer.
  const [autoDir, setAutoDir] = useState<0 | 1 | -1>(0);
  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!canMove || compact || e.pointerType !== 'mouse') return;
    const width = measureRef.current();
    const box = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const reach = width * (layout.x[layout.front] + 0.5);
    setAutoDir(Math.abs(dx) < reach ? 0 : dx > 0 ? 1 : -1);
  };
  useEffect(() => {
    if (!autoDir || !canMove || compact) return;
    step(autoDir);
    const id = setInterval(() => step(autoDir), AUTO_STEP_MS);
    return () => clearInterval(id);
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDir, canMove, compact]);

  // A finger swiped across the row turns it: toward the next card swiping left, the
  // previous one swiping right. The tap that ends a swipe doesn't also open the card.
  const swipeFrom = useRef<number | null>(null);
  const swiped = useRef(false);
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canMove || e.pointerType === 'mouse') return;
    swipeFrom.current = e.clientX;
    swiped.current = false;
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    const from = swipeFrom.current;
    swipeFrom.current = null;
    // A finger that picked a card up and carried it off (see touchSpellDrag) wasn't swiping.
    if (from === null || isTouchDragging()) return;
    const dx = e.clientX - from;
    if (Math.abs(dx) < SWIPE_PX) return;
    swiped.current = true;
    step(dx < 0 ? 1 : -1);
  };
  const handleClickCapture = (e: React.MouseEvent) => {
    if (!swiped.current) return;
    swiped.current = false;
    e.stopPropagation();
    e.preventDefault();
  };

  const places: CoverflowPlace[] = Array.from({ length: shown }, (_, i) => i - half).map((offset) => {
    const at = pos + offset;
    const index = mod(at, size);
    const lap = Math.floor(at / size);
    const empty = index >= count;
    return { offset, index, empty, key: `${empty ? `empty-${index}` : keys[index]}@${lap}`, behind: Math.abs(offset) > layout.front };
  });

  return {
    layout,
    compact,
    half,
    places,
    turning,
    spreading,
    canMove,
    showArrows: canMove && !compact,
    step,
    goTo,
    // For the row's stage (where its cards are): the pointer resting toward an end, swipes,
    // and the click that ends a swipe.
    stageHandlers: {
      onPointerMove: handlePointerMove,
      onPointerLeave: () => setAutoDir(0),
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerCancel: () => { swipeFrom.current = null; },
      onClickCapture: handleClickCapture,
    },
  };
};
