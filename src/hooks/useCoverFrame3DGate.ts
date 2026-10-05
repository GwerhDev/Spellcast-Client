import { useEffect, useState } from 'react';
import { useCoverFrame3DEnabled } from './useCoverFrame3DEnabled';

// Every guardrail for a section's 3D covers, gathered in one hook so a section only has to
// check a single boolean: whether 3D covers can be shown at all (useCoverFrame3DEnabled),
// and the section being in the viewport -- the one that actually toggles during normal use
// (scrolling the section in/out).

export const useCoverFrame3DGate = (sectionRef: React.RefObject<HTMLElement | null>) => {
  const enabled = useCoverFrame3DEnabled();
  // Assumed in view until it's known not to be: a section is nearly always on screen as it
  // mounts, and starting out of view showed its covers flat first, then again in 3D.
  const [inViewport, setInViewport] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    // sectionRef.current is often still null on this effect's first run -- QuickStart (the
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
  }, [sectionRef, enabled]);

  return enabled && inViewport;
};
