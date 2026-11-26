import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../../utils/reducedMotion';

interface CountUpProps {
  value: number;
  // How long the count takes, in ms.
  duration?: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

// A figure that counts up to its value (from where it was: 0 at first), slowing as it gets
// there. Without motion, it's just the value.
export const CountUp = ({ value, duration = 700 }: CountUpProps) => {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (prefersReducedMotion()) { setShown(value); return; }
    const from = shownRef.current;
    if (from === value) return;
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      setShown(from + (value - from) * easeOut(t));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span data-testid="count-up">{Math.round(shown)}</span>;
};
