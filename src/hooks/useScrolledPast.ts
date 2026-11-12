import { useEffect, useState, type RefObject } from 'react';
import { pageStickyTop, scrollParentOf } from '../utils/pageScroll';

// Whether the page has scrolled past an element (it's gone out of view above): e.g. a sticky
// bar taking over from a heading once that heading has scrolled away. Watched by an
// IntersectionObserver on the page's own scroller (or the window), not by listening to every
// scroll.
export const useScrolledPast = (ref: RefObject<HTMLElement | null>): boolean => {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const root = scrollParentOf(el);
    // The document scrolling (a phone), the header sticks over its top: what goes under it is
    // already out of view.
    const top = root ? 0 : pageStickyTop();
    const observer = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)),
      { root, rootMargin: `${-top}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return past;
};
