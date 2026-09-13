import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from './useMediaQuery';
import { useMode3D } from '../context/Mode3DContext';

// TCORE-124: every guardrail the ticket asks for, gathered in one hook so LastSpells only
// has to check a single boolean before mounting CoverFrame3DOverlay -- the user's own
// Mode3D toggle (Appearance settings) is the master switch, desktop + motion-ok are
// static-ish (checked once, reactive to real changes), section-in-viewport is the one that
// actually toggles during normal use (scrolling the section in/out).

const DESKTOP_QUERY = '(min-width: 1025px) and (hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const useCoverFrame3DGate = (sectionRef: React.RefObject<HTMLElement | null>) => {
  const { enabled: mode3dEnabled } = useMode3D();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [inViewport, setInViewport] = useState(false);
  // Bumped once, never reset -- lets a device known to be too weak stay opted out for the
  // rest of the session even if it briefly reports otherwise, cheaper than re-querying it.
  const lowEndRef = useRef(false);

  useEffect(() => {
    // navigator.hardwareConcurrency / deviceMemory are both optional per spec -- absence
    // (Safari doesn't expose deviceMemory) must read as "unknown", not "low-end", so a
    // capable-but-unreporting device isn't excluded.
    const cores = navigator.hardwareConcurrency;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    lowEndRef.current = (typeof cores === 'number' && cores <= 2) || (typeof memory === 'number' && memory <= 2);
  }, []);

  useEffect(() => {
    if (!mode3dEnabled || !isDesktop || reducedMotion) { setInViewport(false); return; }
    // sectionRef.current is often still null on this effect's first run -- LastSpells (the
    // one caller today) renders a loading skeleton before its real .carouselWrapper div
    // (the one carrying this ref) ever mounts, and a plain ref mutation doesn't re-trigger
    // a dependency array (sectionRef itself, as an object, never changes) the way state
    // would. Poll briefly for the element to actually exist rather than assuming it does by
    // the time this effect first runs -- cheap (an interval, not a loop) and self-stops the
    // moment it finds something to observe.
    let io: IntersectionObserver | null = null;
    const poll = window.setInterval(() => {
      const el = sectionRef.current;
      if (!el) return;
      window.clearInterval(poll);
      // A cold hard-reload has layout, fonts and cover images all still settling at the
      // exact moment this mounts -- IntersectionObserver's own first callback can be
      // delayed or briefly report false in that window (observed in practice: a hard
      // reload showed the 2D fallback, only a client-side SPA navigation -- everything
      // already warm -- showed the 3D overlay). A synchronous getBoundingClientRect() read
      // right here isn't subject to that same async delay, so it seeds the real state
      // immediately; the observer then takes over for every scroll/resize after.
      const rect = el.getBoundingClientRect();
      setInViewport(rect.top < window.innerHeight && rect.bottom > 0);
      io = new IntersectionObserver(
        ([entry]) => setInViewport(entry.isIntersecting),
        { threshold: 0.1, rootMargin: '200px 0px' }
      );
      io.observe(el);
    }, 200);
    return () => {
      window.clearInterval(poll);
      io?.disconnect();
    };
  }, [sectionRef, isDesktop, reducedMotion, mode3dEnabled]);

  return mode3dEnabled && isDesktop && !reducedMotion && !lowEndRef.current && inViewport;
};
