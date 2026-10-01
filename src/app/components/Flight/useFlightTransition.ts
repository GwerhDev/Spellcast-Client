import { useLayoutEffect, useRef, useState } from 'react';
import { liveRect, rectOf, type FlightRect } from './flightRect';

// Where a modal was opened from: the place on screen of what it opened (a card's cover, an
// inventory slot), so that thing can fly into the modal and back when closing.
export interface FlightOrigin {
  rect: FlightRect;
  // The element itself, measured again when flying back: the page under the modal may have
  // moved meanwhile. Gone from the page, it flies back to `rect`.
  element?: HTMLElement | null;
}

export interface FlightLeg {
  direction: 'in' | 'out';
  from: FlightRect;
}

interface UseFlightTransitionOptions {
  show: boolean;
  origin: FlightOrigin | null | undefined;
  onClose: () => void;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Opening a modal from something on the page: that thing lifts off its place and flies
// into the modal's slot, which stays hidden until it lands; closing flies it back and only
// then closes. Without an origin (or with reduced motion), the modal just opens and closes.
//
// The owner puts `slotRef` on the slot (hidden while `leg` is set), closes through
// `requestClose`, passes `modalMotion` to CustomModal, and while `leg` is set renders a
// Flight (or a variant) with `flightProps`, keyed by `leg.direction`: closing while it's
// still flying in turns it back from where it is, as a new flight.
export const useFlightTransition = ({ show, origin, onClose }: UseFlightTransitionOptions) => {
  const slotRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [leg, setLeg] = useState<FlightLeg | null>(null);
  const [leaving, setLeaving] = useState(false);
  const flownIn = useRef(false);
  const flies = !!origin && !prefersReducedMotion();

  // Takes off right away: the slot it lands in is there from the first render. If the modal
  // settles as the rest of its content arrives, the flight follows the slot there.
  useLayoutEffect(() => {
    if (!show) { flownIn.current = false; setLeg(null); setLeaving(false); return; }
    if (!flies || !origin || flownIn.current || !slotRef.current) return;
    flownIn.current = true;
    setLeg({ direction: 'in', from: origin.rect });
  }, [show, flies, origin]);

  const target = () => leg?.direction === 'out'
    // Where it came from now, not where it was when clicked.
    ? liveRect(origin?.element, origin?.rect ?? null)
    : slotRef.current ? rectOf(slotRef.current) : null;

  const requestClose = () => {
    if (leaving) return;
    if (!flies || !origin || !slotRef.current) { onClose(); return; }
    setLeaving(true);
    // Still flying in: turn back from where it is right now, not from the slot.
    const from = leg?.direction === 'in' && boxRef.current ? rectOf(boxRef.current) : rectOf(slotRef.current);
    setLeg({ direction: 'out', from });
  };

  const onDone = () => {
    const direction = leg?.direction;
    setLeg(null);
    if (direction === 'out') onClose();
  };

  return {
    slotRef,
    leg,
    leaving,
    requestClose,
    modalMotion: flies ? (leaving ? 'leave' as const : 'enter' as const) : undefined,
    flightProps: leg
      ? { from: leg.from, target, lift: leg.direction === 'in', boxRef, onDone }
      : null,
  };
};
