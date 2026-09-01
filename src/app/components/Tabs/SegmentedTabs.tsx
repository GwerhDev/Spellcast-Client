import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import s from './SegmentedTabs.module.css';

export interface SegmentedTab {
  id: string;
  label: string;
  icon?: IconDefinition;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  active: string;
  onChange: (id: string) => void;
  compact?: boolean;
}

const positionClass = (index: number, total: number) => {
  if (total === 1) return '';
  if (index === 0) return s.left;
  if (index === total - 1) return s.right;
  return s.middle;
};

// How far each arrow click scrolls, as a fraction of the visible width -- keeps roughly
// one "page" of tabs in view rather than a fixed pixel amount that would feel wrong at
// very different container widths.
const SCROLL_STEP_RATIO = 0.8;

// The one shared component in the button-consistency migration's "segmented tabs" family —
// FilterTabs and InputTypeSelector were two near-identical implementations of this exact
// joined-pill-group pattern (rounded ends, square middle, active fill). TabModal's own
// sidebar tabs are a visually different pattern (a vertical rail of independent icon-only
// squares) and don't belong here.
//
// Responsive overflow: once the tab strip is wider than its container (many tabs on a
// narrow viewport -- e.g. CasterLayout's 6-tab bar on mobile), it becomes a horizontally
// scrollable slider with side arrow buttons. Native touch swipe comes for free from
// `overflow-x: auto`; the arrows are the click/pointer equivalent. Detected via real
// scrollWidth/clientWidth (not a hardcoded tab count) so it adapts to whatever the actual
// viewport is, rather than showing arrows on a wide screen that didn't need them or missing
// an overflow a fixed threshold didn't anticipate.
export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({ tabs, active, onChange, compact }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateOverflow = useCallback(() => {
    const containerEl = containerRef.current;
    const scrollEl = scrollRef.current;
    if (!containerEl || !scrollEl) return;
    // Overflow is measured against the OUTER container's width, not the scroll strip's own
    // clientWidth -- the strip's clientWidth shrinks by the arrows' own ~64px once they
    // appear, which would otherwise feed back into this very calculation (arrows appear ->
    // strip shrinks -> now "overflowing" by less -> arrows disappear -> strip grows back ->
    // overflowing again -> ...), visibly flickering the tab bar on every resize tick. The
    // outer container's width comes from its parent layout and is never affected by whether
    // the arrows are currently rendered, so this can't feed back on itself.
    const isOverflowing = scrollEl.scrollWidth > containerEl.clientWidth + 1;
    setOverflowing(isOverflowing);
    setCanScrollLeft(isOverflowing && scrollEl.scrollLeft > 0);
    setCanScrollRight(isOverflowing && scrollEl.scrollLeft + scrollEl.clientWidth < scrollEl.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateOverflow();
    const containerEl = containerRef.current;
    const scrollEl = scrollRef.current;
    if (!containerEl || !scrollEl) return;
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(containerEl);
    scrollEl.addEventListener('scroll', updateOverflow);
    return () => {
      observer.disconnect();
      scrollEl.removeEventListener('scroll', updateOverflow);
    };
  }, [tabs, updateOverflow]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * SCROLL_STEP_RATIO, behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      data-testid="segmented-tabs-container"
      className={s.container}
      style={compact ? { marginBottom: 0 } : undefined}
    >
      {overflowing && (
        <button
          type="button"
          data-testid="segmented-tabs-arrow-left"
          className={s.arrowButton}
          onClick={() => scrollByPage(-1)}
          disabled={!canScrollLeft}
          aria-label="Scroll tabs left"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
      )}

      <span
        ref={scrollRef}
        data-testid="segmented-tabs-scroll"
        className={`${s.buttonsContainer} ${overflowing ? s.scrollable : ''}`}
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            data-testid={`segmented-tab-${tab.id}`}
            className={`${s.tabButton} ${positionClass(i, tabs.length)} ${active === tab.id ? s.active : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <FontAwesomeIcon icon={tab.icon} />}
            <span className={s.title}>{tab.label}</span>
          </button>
        ))}
      </span>

      {overflowing && (
        <button
          type="button"
          data-testid="segmented-tabs-arrow-right"
          className={s.arrowButton}
          onClick={() => scrollByPage(1)}
          disabled={!canScrollRight}
          aria-label="Scroll tabs right"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      )}
    </div>
  );
};
