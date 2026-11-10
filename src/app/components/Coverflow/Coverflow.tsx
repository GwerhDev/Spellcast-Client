import { useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../Buttons/IconButton';
import { placeValues, spanOf, useCoverflow, type CoverflowLayout } from './useCoverflow';
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
  // Items leaving the row that go at once instead of fading out where they were: something
  // else carries them away (a spell going to the altar). A card left fading there would show
  // again in the meantime (e.g. its cover back as its drag ends).
  vanishing?: string[];
}

// A place's look (see placeValues), as the card's transform and filter.
const placeAt = (l: CoverflowLayout, offset: number) => {
  const v = placeValues(l, offset);
  return {
    x: `${v.x * 100}%`,
    scale: v.scale,
    // The same filter functions at every place, so moving between them can be animated.
    filter: `brightness(${v.brightness}) drop-shadow(0px 14px 22px rgba(0, 0, 0, ${v.shadow}))`,
    opacity: v.opacity,
    zIndex: v.zIndex,
  };
};

// A row of cards in perspective, like flipping through a stack: a front row of cards side by
// side around the centered one, and the rest fanning out behind its ends, smaller and
// dimmer, overlapping. It wraps around, and places with no item are filled (renderEmpty),
// so the row is always whole. Clicks on the front row reach its cards as usual; a card
// behind it is brought to the center instead. With room, arrows sit at its sides and
// resting the pointer over the cards behind keeps it moving that way; narrow, it shows one
// card in front and is swiped through. On mounting, the cards spread out from the center.
export const Coverflow = ({ items, renderEmpty, itemWidth, slots = 7, interactive = true, labels, testId = 'coverflow', vanishing = [] }: CoverflowProps) => {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { layout, compact, half, places, turning, spreading, showArrows, step, goTo, stageHandlers } = useCoverflow({
    keys: items.map(item => item.key),
    slots,
    interactive,
    rootRef,
    measureItem: () => stageRef.current?.querySelector<HTMLElement>('[data-offset="0"]')?.offsetWidth ?? 0,
  });
  const transition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 30 };

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
        {...stageHandlers}
      >
        <AnimatePresence initial custom={vanishing}>
          {places.map(({ offset, index, empty, key, behind }) => {
            const item = empty ? null : items[index];
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
                // Leaving, it fades out where it was, or is gone at once (see `vanishing`): read at
                // the moment it leaves, from the row's latest `vanishing`.
                custom={vanishing}
                variants={{
                  // (A place's key is its item's, with the lap it's on: `<key>@<lap>`.)
                  gone: (vanish: string[] = []) => (vanish.includes(key.slice(0, key.lastIndexOf('@')))
                    ? { opacity: 0, transition: { duration: 0 } }
                    : { ...placeAt(layout, offset), opacity: 0 }),
                }}
                exit="gone"
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
