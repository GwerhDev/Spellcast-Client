import { useEffect, useState, type RefObject } from 'react';

// The nearest ancestor that scrolls: the page's own scroller.
const scrollParentOf = (el: HTMLElement | null): HTMLElement | null => {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
};

// Whether the page has scrolled past an element (it's gone out of view above): e.g. a sticky
// bar taking over from a heading once that heading has scrolled away. Watched by an
// IntersectionObserver on the page's own scroller, not by listening to every scroll.
export const useScrolledPast = (ref: RefObject<HTMLElement | null>): boolean => {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)),
      { root: scrollParentOf(el), threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return past;
};
