import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_PAGE_SIZE = 20;

// Renders `items` progressively instead of all at once: `sentinelRef` should be
// attached to a marker element after the last rendered item. IntersectionObserver
// grows the visible slice by one page once that marker scrolls into view, so cards
// (and whatever they mount per-item, e.g. cover object URLs) only get created as the
// user actually scrolls to them (TCORE-80).
export const useInfiniteList = <T,>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) => {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination when the underlying list changes identity (new filter/search/fetch)
  // so a shorter result set doesn't stay stuck showing a stale, larger slice.
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((count) => Math.min(count + pageSize, items.length));
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, pageSize]);

  const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  return { visible, hasMore, sentinelRef };
};
