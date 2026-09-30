import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import s from './CoverFlight.module.css';

export interface FlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CoverFlightProps {
  src: string;
  from: FlightRect;
  // Where it lands, read when it's needed: at takeoff, and again on arrival -- if the
  // destination moved meanwhile (the modal settling as its content loads), the image
  // follows it there in a short last stretch instead of the real one jumping into place.
  target: () => FlightRect | null;
  // Leaving a card: it first lifts off its place (rises, grows a little) before flying.
  lift?: boolean;
  onDone: () => void;
}

const LIFT_PX = 14;
const LIFT_SCALE = 1.06;
// How far the destination may move (px) before the image follows it instead of landing.
const SETTLE_TOLERANCE = 1;

const moved = (a: FlightRect, b: FlightRect) =>
  Math.abs(a.top - b.top) > SETTLE_TOLERANCE || Math.abs(a.left - b.left) > SETTLE_TOLERANCE
  || Math.abs(a.width - b.width) > SETTLE_TOLERANCE || Math.abs(a.height - b.height) > SETTLE_TOLERANCE;

// A cover image flying between two places on screen (e.g. from a spell card into its detail
// modal, and back), drawn over everything while the real ones hide: the image seems to
// travel from one to the other instead of one disappearing and the other appearing.
export const CoverFlight = ({ src, from, target, lift = false, onDone }: CoverFlightProps) => {
  const [dest, setDest] = useState<FlightRect>(() => target() ?? from);
  // The first leg (with the lift) vs a short follow-up after the destination moved.
  const [leg, setLeg] = useState<'flight' | 'settle'>('flight');

  const lifted = {
    top: from.top - LIFT_PX - (from.height * (LIFT_SCALE - 1)) / 2,
    left: from.left - (from.width * (LIFT_SCALE - 1)) / 2,
    width: from.width * LIFT_SCALE,
    height: from.height * LIFT_SCALE,
  };
  const withLift = lift && leg === 'flight';
  const path = withLift
    ? {
      top: [from.top, lifted.top, dest.top],
      left: [from.left, lifted.left, dest.left],
      width: [from.width, lifted.width, dest.width],
      height: [from.height, lifted.height, dest.height],
    }
    : { top: dest.top, left: dest.left, width: dest.width, height: dest.height };

  const handleComplete = () => {
    const now = target();
    if (now && moved(now, dest)) {
      setLeg('settle');
      setDest(now);
      return;
    }
    onDone();
  };

  return createPortal(
    <motion.img
      data-testid="cover-flight"
      src={src}
      alt=""
      aria-hidden="true"
      className={s.flight}
      initial={{ top: from.top, left: from.left, width: from.width, height: from.height }}
      animate={path}
      transition={withLift
        ? { duration: 0.55, times: [0, 0.28, 1], ease: ['easeOut', [0.22, 1, 0.36, 1]] }
        : { duration: leg === 'settle' ? 0.18 : 0.4, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={handleComplete}
    />,
    document.body,
  );
};
