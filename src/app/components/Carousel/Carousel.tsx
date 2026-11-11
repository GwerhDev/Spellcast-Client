import s from './Carousel.module.css';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../Buttons/IconButton';

interface CarouselProps {
  children: ReactNode;
  // How wide each item is: they keep their size, in one row that scrolls sideways.
  itemWidth: string;
  // What its buttons are called (for a screen reader, and their tooltip).
  previousLabel: string;
  nextLabel: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

// A row of items that scrolls sideways (snapping to them), its edges fading where there's more
// to see: none at its start at rest, none at its end once there; never over an item it shows
// whole for nothing. With a mouse, hovering it shows a button on each side there's more to see,
// to scroll it by most of its width.
export const Carousel = ({ children, itemWidth, previousLabel, nextLabel, ...rest }: CarouselProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ before: false, after: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const before = el.scrollLeft > 1;
      const after = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setMore(m => (m.before === before && m.after === after ? m : { before, after }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    // Its width, or its items', can change (a narrower window, a search filtering them).
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    resize?.observe(el);
    const mutations = new MutationObserver(update);
    mutations.observe(el, { childList: true });
    return () => { el.removeEventListener('scroll', update); resize?.disconnect(); mutations.disconnect(); };
  }, []);

  const scrollBy = (direction: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };
  const testId = rest['data-testid'];

  return (
    <div className={s.root}>
      <div
        ref={ref}
        className={s.carousel}
        style={{ '--item-width': itemWidth } as React.CSSProperties}
        data-more-before={more.before || undefined}
        data-more-after={more.after || undefined}
        role="group"
        {...rest}
      >
        {children}
      </div>
      {more.before && (
        <IconButton
          className={`${s.arrow} ${s.previous}`}
          icon={faChevronLeft}
          title={previousLabel}
          onClick={() => scrollBy(-1)}
          data-testid={testId ? `${testId}-previous` : undefined}
        />
      )}
      {more.after && (
        <IconButton
          className={`${s.arrow} ${s.next}`}
          icon={faChevronRight}
          title={nextLabel}
          onClick={() => scrollBy(1)}
          data-testid={testId ? `${testId}-next` : undefined}
        />
      )}
    </div>
  );
};
