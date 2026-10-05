import { useState } from 'react';
import { useMediaQuery } from './useMediaQuery';
import { useMode3D } from '../context/Mode3DContext';

const DESKTOP_QUERY = '(min-width: 1025px) and (hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// navigator.hardwareConcurrency / deviceMemory are both optional per spec -- absence
// (Safari doesn't expose deviceMemory) must read as "unknown", not "low-end", so a
// capable-but-unreporting device isn't excluded.
const isLowEnd = () => {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return (typeof cores === 'number' && cores <= 2) || (typeof memory === 'number' && memory <= 2);
};

// Whether 3D covers can be shown at all: the user's own Mode3D toggle (Appearance settings),
// on a desktop, with motion allowed, on a device that isn't known to be too weak. A cover
// that's always in view while it's shown (e.g. in a modal) needs nothing more; a section of
// cards adds being in the viewport (see useCoverFrame3DGate).
export const useCoverFrame3DEnabled = (): boolean => {
  const { enabled: mode3dEnabled } = useMode3D();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  // Read once: a device known to be too weak stays opted out for the session.
  const [lowEnd] = useState(isLowEnd);
  return mode3dEnabled && isDesktop && !reducedMotion && !lowEnd;
};
