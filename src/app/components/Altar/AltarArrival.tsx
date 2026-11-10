import s from './AltarArrival.module.css';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion, type Easing, type TargetAndTransition, type Transition } from 'framer-motion';
import type { ScreenRect } from '../../../store/altarSlice';

export type AltarFlightKind = 'drop' | 'flight' | 'return';

interface AltarArrivalProps {
  // Dropped on the altar: it melts in from where it was let go (where the browser drew the
  // card being carried). Conjured another way: it flies there from its card. Dispelled: it
  // goes back from the altar to its card.
  kind: AltarFlightKind;
  from: ScreenRect;
  to: ScreenRect;
  // The spell's cover; a glow of light if it has none.
  coverUrl: string | null;
  onDone: () => void;
}

// How long each way takes (s).
const DURATION: Record<AltarFlightKind, number> = { drop: 0.7, flight: 0.85, return: 0.75 };
// Pulled in faster and faster, as if the altar drew it in.
const DRAWN_IN: Easing = [0.55, 0, 1, 0.45];
const centerOf = (r: ScreenRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// A spell's cover going to the altar's center (melting into it: shrinking, brightening and
// fading, with a ring of light where it lands) or back from it to its card (taking shape again
// there). Over the whole page (in a portal), wherever the altar and the card are.
export function AltarArrival({ kind, from, to, coverUrl, onDone }: AltarArrivalProps) {
  const reduced = useReducedMotion();
  // Without motion, it's there at once.
  useEffect(() => { if (reduced) onDone(); }, [reduced, onDone]);
  if (reduced) return null;

  const duration = DURATION[kind];
  const leaving = kind === 'return';
  // The altar's center, and the cover at its own size (the card's: scaled, not resized).
  const altar = leaving ? from : to;
  const card = leaving ? to : from;
  const at = centerOf(altar);
  const size = { width: card.width, height: card.height };
  const onCard = { x: card.left, y: card.top };
  const inAltar = { x: at.x - card.width / 2, y: at.y - card.height / 2 };
  const ring = Math.max(altar.width, altar.height);

  const motionOf = (): { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition } => {
    if (kind === 'drop') return {
      initial: { x: onCard.x, y: onCard.y, scale: 1, rotate: 0, opacity: 1, filter: 'brightness(1) blur(0px)' },
      animate: {
        // Let go, it settles for a breath (a little lift), then the altar draws it in, turning.
        x: [onCard.x, onCard.x, inAltar.x],
        y: [onCard.y, onCard.y - 8, inAltar.y],
        scale: [1, 1.05, 0.08],
        rotate: [0, -2, 14],
        opacity: [1, 1, 0],
        filter: ['brightness(1) blur(0px)', 'brightness(1.2) blur(0px)', 'brightness(2) blur(6px)'],
      },
      transition: { duration, times: [0, 0.2, 1], ease: ['easeOut', DRAWN_IN] },
    };
    if (kind === 'flight') return {
      initial: { x: onCard.x, y: onCard.y, scale: 1, opacity: 1, filter: 'brightness(1) blur(0px)' },
      animate: {
        // Lifted a little on its way to the altar.
        x: [onCard.x, (onCard.x + inAltar.x) / 2, inAltar.x],
        y: [onCard.y, Math.min(onCard.y, inAltar.y) - 40, inAltar.y],
        scale: [1, 0.85, 0.1],
        opacity: [1, 1, 0],
        filter: ['brightness(1) blur(0px)', 'brightness(1.2) blur(0px)', 'brightness(2) blur(6px)'],
      },
      transition: { duration, ease: 'easeInOut' },
    };
    return {
      initial: { x: inAltar.x, y: inAltar.y, scale: 0.1, opacity: 0, filter: 'brightness(2) blur(6px)' },
      animate: {
        // Out of the altar's light, arcing down to its place in the row.
        x: [inAltar.x, (onCard.x + inAltar.x) / 2, onCard.x],
        y: [inAltar.y, Math.min(onCard.y, inAltar.y) - 40, onCard.y],
        scale: [0.1, 0.85, 1],
        opacity: [0, 1, 1],
        filter: ['brightness(2) blur(6px)', 'brightness(1.2) blur(0px)', 'brightness(1) blur(0px)'],
      },
      transition: { duration, ease: 'easeInOut' },
    };
  };
  const { initial, animate, transition } = motionOf();
  // The ring of light where it lands in the altar, or where it leaves it.
  const ringTimes = leaving ? [0, 0.25, 1] : [0, duration / (duration + 0.35), 1];

  return createPortal(
    <div className={s.layer} data-testid="altar-arrival" data-kind={kind} aria-hidden="true">
      <motion.div className={s.cover} style={size} initial={initial} animate={animate} transition={transition} onAnimationComplete={onDone}>
        {coverUrl
          ? <img src={coverUrl} alt="" className={s.image} draggable={false} data-testid="altar-arrival-cover" />
          : <div className={s.glow} data-testid="altar-arrival-glow" />}
      </motion.div>
      <motion.div
        className={s.ring}
        style={{ left: at.x - ring / 2, top: at.y - ring / 2, width: ring, height: ring }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: leaving ? [0.6, 1.1, 1.5] : [0.6, 0.6, 1.5], opacity: [0, 0.9, 0] }}
        transition={{ duration: leaving ? 0.6 : duration + 0.35, times: ringTimes, ease: 'easeOut' }}
      />
    </div>,
    document.body,
  );
}
