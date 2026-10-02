import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../Buttons/IconButton';
import { isTouchDragging } from '../../../utils/touchSpellDrag';
import s from './Coverflow.module.css';

export interface CoverflowItem {
  key: string;
  // The item, or a function of its place: only the front row is reachable by keyboard
  // (the cards behind are brought forward with the arrows, or a click), so an item that
  // can take focus should only do so while `front`.
  node: ReactNode | ((place: { front: boolean }) => ReactNode);
}

interface CoverflowProps {
  items: CoverflowItem[];
  // What fills a place with no item, so the row is always full (e.g. an empty card).
  renderEmpty: (key: string) => ReactNode;
  // How many places are shown with room for the full row: the centered one and the same
  // number on each side. Without that room (a phone), it's COMPACT.slots.
  slots?: number;
  // How wide one card is (a CSS length), so the row is exactly as wide as the cards fanned
  // out in it, with the arrows right at its sides.
  itemWidth: string;
  // Off while loading: no arrows, nothing to pick.
  interactive?: boolean;
  labels?: { previous: string; next: string };
  testId?: string;
}

interface Layout {
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
const WIDE: Layout = {
  front: 1,
  x: [0, 1.06, 1.92, 2.6],
  scale: [1, 1, 0.86, 0.74],
  brightness: [1, 1, 0.66, 0.46],
  shadow: [0.5, 0.5, 0.25, 0.12],
};
// A narrow row (a phone): one card in front, swiped through, no arrows.
const COMPACT: Layout & { slots: number } = {
  slots: 5,
  front: 0,
  x: [0, 0.6, 1.02],
  scale: [1, 0.82, 0.66],
  brightness: [1, 0.62, 0.42],
  shadow: [0.5, 0.25, 0.12],
};
// The arrows and the gaps beside the row, which the wide layout needs room for too.
const ARROWS_PX = 2 * (32 + 12);
const AUTO_STEP_MS = 520;
// How far a finger has to travel across the row to turn it.
const SWIPE_PX = 40;

const mod = (n: number, m: number) => ((n % m) + m) % m;

const last = (l: Layout) => l.x.length - 1;
// Past the last place (a card coming in from, or going out to, beyond the edge).
const xAt = (l: Layout, d: number) => {
  const end = last(l);
  return d <= end ? l.x[d] : l.x[end] + (d - end) * (l.x[end] - l.x[end - 1]);
};
// From the outer edge of the leftmost card to that of the rightmost, in card widths.
const spanOf = (l: Layout, half: number) => 2 * (xAt(l, half) + l.scale[Math.min(half, last(l))] / 2);

const placeAt = (l: Layout, offset: number) => {
  const d = Math.min(Math.abs(offset), last(l));
  return {
    x: `${Math.sign(offset) * xAt(l, Math.abs(offset)) * 100}%`,
    scale: l.scale[d],
    // The same filter functions at every place, so moving between them can be animated.
    filter: `brightness(${l.brightness[d]}) drop-shadow(0px 14px 22px rgba(0, 0, 0, ${l.shadow[d]}))`,
    opacity: Math.abs(offset) > last(l) ? 0 : 1,
    zIndex: 10 - Math.abs(offset),
  };
};

// A row of cards in perspective, like flipping through a stack: a front row of cards side by
// side around the centered one, and the rest fanning out behind its ends, smaller and
// dimmer, overlapping. It wraps around, and places with no item are filled (renderEmpty),
// so the row is always whole. Clicks on the front row reach its cards as usual; a card
// behind it is brought to the center instead. With room, arrows sit at its sides and
// resting the pointer over the cards behind keeps it moving that way; narrow, it shows one
// card in front and is swiped through. On mounting, the cards spread out from the center.
export const Coverflow = ({ items, renderEmpty, itemWidth, slots = 7, interactive = true, labels, testId = 'coverflow' }: CoverflowProps) => {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Narrow when the wide row (with its arrows) doesn't fit where the row is -- measured on
  // the row itself, not the screen, so it follows whatever room the page gives it.
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const card = stageRef.current?.querySelector<HTMLElement>('[data-offset="0"]');
      if (!card?.offsetWidth) return;
      setCompact(root.clientWidth < card.offsetWidth * spanOf(WIDE, Math.floor(slots / 2)) + ARROWS_PX);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [slots]);

  const layout = compact ? COMPACT : WIDE;
  const shown = compact ? COMPACT.slots : slots;
  const half = Math.floor(shown / 2);
  const size = Math.max(items.length, shown);
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
  const canMove = interactive && items.length > 1;

  const step = (dir: 1 | -1) => {
    if (items.length < 2) return;
    setPos((from) => {
      let next = from + dir;
      // Only the items themselves get to the center, never an empty place.
      while (mod(next, size) >= items.length) next += dir;
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
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!canMove || compact || e.pointerType !== 'mouse') return;
    const stage = stageRef.current;
    const center = stage?.querySelector<HTMLElement>('[data-offset="0"]');
    if (!stage || !center) return;
    const box = stage.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const reach = center.offsetWidth * (layout.x[layout.front] + 0.5);
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

  const transition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 30 };
  const places = Array.from({ length: shown }, (_, i) => i - half).map((offset) => {
    const at = pos + offset;
    const index = mod(at, size);
    const lap = Math.floor(at / size);
    const item = index < items.length ? items[index] : null;
    return { offset, index, item, key: `${item ? item.key : `empty-${index}`}@${lap}` };
  });
  const showArrows = canMove && !compact;

  return (
    <div ref={rootRef} data-testid={testId} data-layout={compact ? 'compact' : 'wide'} className={s.coverflow}>
      {showArrows && (
        <IconButton data-testid={`${testId}-prev`} icon={faChevronLeft} variant="transparent" className={s.nav} title={labels?.previous} onClick={() => step(-1)} />
      )}
      <div
        ref={stageRef}
        data-testid={`${testId}-stage`}
        className={s.stage}
        style={{ width: `calc(${itemWidth} * ${spanOf(layout, half)})` }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setAutoDir(0)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { swipeFrom.current = null; }}
        onClickCapture={handleClickCapture}
      >
        <AnimatePresence initial>
          {places.map(({ offset, index, item, key }) => {
            const behind = Math.abs(offset) > layout.front;
            const enterFrom = spreading.current
              ? { ...placeAt(layout, 0), scale: 0.6, opacity: 0 }
              : { ...placeAt(layout, turning ? offset + Math.sign(offset) : offset), opacity: 0 };
            return (
              <motion.div
                key={key}
                data-testid={`${testId}-place`}
                data-offset={offset}
                className={`${s.place} ${behind ? '' : s.front}`}
                initial={enterFrom}
                animate={placeAt(layout, offset)}
                exit={{ ...placeAt(layout, offset), opacity: 0 }}
                transition={spreading.current && !reduced ? { ...transition, delay: Math.abs(offset) * 0.07 } : transition}
                onAnimationComplete={() => { spreading.current = false; }}
                // A card behind the front row is brought to the center first; it only acts
                // once it's in front.
                onClickCapture={behind && interactive ? (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (item) goTo(index);
                } : undefined}
                aria-hidden={behind || undefined}
              >
                {item
                  ? (typeof item.node === 'function' ? item.node({ front: !behind }) : item.node)
                  : renderEmpty(`empty-${index}`)}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {showArrows && (
        <IconButton data-testid={`${testId}-next`} icon={faChevronRight} variant="transparent" className={s.nav} title={labels?.next} onClick={() => step(1)} />
      )}
    </div>
  );
};
