import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, type Transition } from 'framer-motion';
import s from './Flight.module.css';
import type { FlightRect } from './flightRect';

export type { FlightRect } from './flightRect';

export interface FlightProps {
  // What flies: its front face, filling the flying box.
  children: ReactNode;
  // Its back face, seen halfway through the turn on arrival (only with `spin`).
  back?: ReactNode;
  from: FlightRect;
  // Where it lands, read when it's needed: at takeoff, and again on arrival -- if the
  // destination moved meanwhile (a modal settling as its content loads), it follows it
  // there in a short last stretch instead of the real one jumping into place.
  target: () => FlightRect | null;
  // Leaving its place: it first lifts off (rises, grows a little) before flying.
  lift?: boolean;
  // Arriving: it turns a full circle over its place (its back showing halfway) before
  // settling there.
  spin?: boolean;
  // The corners of both faces, matching what it leaves and lands on.
  radius?: string;
  // Extra classes for each face (e.g. square corners under a frame).
  faceClassName?: string;
  onDone: () => void;
  // The flying box, for an owner that needs where it is right now (e.g. to turn it back
  // mid-flight from that exact spot).
  boxRef?: React.Ref<HTMLDivElement>;
  testId?: string;
}

const LIFT_PX = 14;
const LIFT_SCALE = 1.06;
// How far the destination may move (px) before it follows it instead of landing.
const SETTLE_TOLERANCE = 1;

const moved = (a: FlightRect, b: FlightRect) =>
  Math.abs(a.top - b.top) > SETTLE_TOLERANCE || Math.abs(a.left - b.left) > SETTLE_TOLERANCE
  || Math.abs(a.width - b.width) > SETTLE_TOLERANCE || Math.abs(a.height - b.height) > SETTLE_TOLERANCE;

// Something flying between two places on screen (e.g. from a card into its detail modal,
// and back), drawn over everything while the real ones hide: it seems to travel from one to
// the other instead of one disappearing and the other appearing. See useFlightTransition
// for the usual owner.
export const Flight = ({
  children, back, from, target, lift = false, spin = false, radius = '.2rem', faceClassName = '', onDone, boxRef, testId = 'flight',
}: FlightProps) => {
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
      ref={boxRef}
      data-testid={testId}
      data-leg={leg}
      aria-hidden="true"
      className={s.flight}
      style={{ transformPerspective: 1100, ['--flight-radius' as string]: radius }}
      initial={{ top: from.top, left: from.left, width: from.width, height: from.height, rotateY: 0 }}
      animate={path}
      transition={transition}
      onAnimationComplete={handleComplete}
    >
      <div data-testid={`${testId}-front`} className={`${s.face} ${faceClassName}`}>
        {children}
      </div>
      {spin && back && (
        <div data-testid={`${testId}-back`} className={`${s.face} ${s.back} ${faceClassName}`}>
          {back}
        </div>
      )}
    </motion.div>,
    document.body,
  );
};
