import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, type Transition } from 'framer-motion';
import spellcastLogo from '../../../assets/spellcast-logo.svg';
import s from './CoverFlight.module.css';
import type { FlightRect } from './flightRect';

export type { FlightRect } from './flightRect';

interface CoverFlightProps {
  src: string;
  from: FlightRect;
  // Where it lands, read when it's needed: at takeoff, and again on arrival -- if the
  // destination moved meanwhile (the modal settling as its content loads), the image
  // follows it there in a short last stretch instead of the real one jumping into place.
  target: () => FlightRect | null;
  // Leaving a card: it first lifts off its place (rises, grows a little) before flying.
  lift?: boolean;
  // Arriving: it turns a full circle over its place (its back showing the app's mark
  // halfway) before settling there.
  spin?: boolean;
  onDone: () => void;
  // The flying cover, for an owner that needs where it is right now (e.g. to turn it back
  // mid-flight from that exact spot).
  imageRef?: React.Ref<HTMLDivElement>;
}

const LIFT_PX = 14;
const LIFT_SCALE = 1.06;
// How far the destination may move (px) before the image follows it instead of landing.
const SETTLE_TOLERANCE = 1;

// Quoted: Vite inlines small SVGs as data URIs containing single quotes, which an unquoted
// url() rejects.
const brandMask = `url("${spellcastLogo}")`;

const moved = (a: FlightRect, b: FlightRect) =>
  Math.abs(a.top - b.top) > SETTLE_TOLERANCE || Math.abs(a.left - b.left) > SETTLE_TOLERANCE
  || Math.abs(a.width - b.width) > SETTLE_TOLERANCE || Math.abs(a.height - b.height) > SETTLE_TOLERANCE;

// A cover flying between two places on screen (e.g. from a spell card into its detail
// modal, and back), drawn over everything while the real ones hide: the cover seems to
// travel from one to the other instead of one disappearing and the other appearing. It's a
// card with two faces: the cover in front and the app's mark on its back, seen when it spins.
export const CoverFlight = ({ src, from, target, lift = false, spin = false, onDone, imageRef }: CoverFlightProps) => {
  const [dest, setDest] = useState<FlightRect>(() => target() ?? from);
  // The first leg (with the lift), a short follow-up after the destination moved, and the
  // turn over the landing spot.
  const [leg, setLeg] = useState<'flight' | 'settle' | 'spin'>('flight');

  const lifted = {
    top: from.top - LIFT_PX - (from.height * (LIFT_SCALE - 1)) / 2,
    left: from.left - (from.width * (LIFT_SCALE - 1)) / 2,
    width: from.width * LIFT_SCALE,
    height: from.height * LIFT_SCALE,
  };
  const at = { top: dest.top, left: dest.left, width: dest.width, height: dest.height };
  const withLift = lift && leg === 'flight';
  const path = withLift
    ? {
      top: [from.top, lifted.top, dest.top],
      left: [from.left, lifted.left, dest.left],
      width: [from.width, lifted.width, dest.width],
      height: [from.height, lifted.height, dest.height],
      rotateY: 0,
    }
    : leg === 'spin'
      // In place: a full turn, rising a touch as it swings through and settling back.
      ? { ...at, rotateY: 360, scale: [1, 1.05, 1] }
      : { ...at, rotateY: 0 };

  const transition: Transition = leg === 'spin'
    ? { duration: 0.75, ease: [0.45, 0, 0.25, 1] }
    : withLift
      ? { duration: 0.55, times: [0, 0.28, 1], ease: ['easeOut', [0.22, 1, 0.36, 1]] }
      : { duration: leg === 'settle' ? 0.18 : 0.4, ease: [0.4, 0, 0.2, 1] };

  const handleComplete = () => {
    if (leg !== 'spin') {
      const now = target();
      if (now && moved(now, dest)) {
        setLeg('settle');
        setDest(now);
        return;
      }
      if (spin) { setLeg('spin'); return; }
    }
    onDone();
  };

  return createPortal(
    <motion.div
      ref={imageRef}
      data-testid="cover-flight"
      data-leg={leg}
      aria-hidden="true"
      className={s.flight}
      style={{ transformPerspective: 1100 }}
      initial={{ top: from.top, left: from.left, width: from.width, height: from.height, rotateY: 0 }}
      animate={path}
      transition={transition}
      onAnimationComplete={handleComplete}
    >
      <img data-testid="cover-flight-front" src={src} alt="" className={`${s.face} ${s.front}`} />
      <div data-testid="cover-flight-back" className={`${s.face} ${s.back}`}>
        <span className={s.mark} style={{ maskImage: brandMask, WebkitMaskImage: brandMask }} />
      </div>
    </motion.div>,
    document.body,
  );
};
