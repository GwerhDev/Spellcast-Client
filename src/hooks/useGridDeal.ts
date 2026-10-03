import { useLayoutEffect, useRef, type RefObject } from 'react';

// The Grimoire's entrance: the first time the grid shows its cards they're dealt onto it
// like cards tossed on a table, one after another in the grid's order -- each flies in
// from the dealer's hand (below the middle of the screen), turning, lands a little big
// and settles into its cell, square. Only once: a refetch or the infinite list's next
// page just appears.
//
// Played on the cards themselves with the Web Animations API (no wrappers, nothing left
// on them once done), so the grid, the selection box and the cards' own transforms
// (hover, lift) are untouched.

const DURATION_MS = 560;
// Between one card leaving the hand and the next.
const DEAL_STEP_MS = 55;
// Cards past this many are dealt together with the last of them, so a long list doesn't
// keep dealing (the far ones are out of sight anyway).
const MAX_STAGGERED = 18;

export const dealDelay = (index: number) => Math.min(index, MAX_STAGGERED) * DEAL_STEP_MS;

// How far each card is turned as it leaves the hand: a different, fixed tilt per card
// (alternating sides), so the deal looks tossed rather than mechanical yet the same every
// time.
export const dealTilt = (index: number) => {
  const magnitude = 8 + ((index * 7) % 5) * 4; // 8..24°
  return index % 2 === 0 ? -magnitude : magnitude;
};

export const useGridDeal = (gridRef: RefObject<HTMLElement | null>, ready: boolean) => {
  const done = useRef(false);
  useLayoutEffect(() => {
    if (!ready || done.current) return;
    const grid = gridRef.current;
    const cards = grid ? (Array.from(grid.children) as HTMLElement[]) : [];
    if (!grid || cards.length === 0) return;
    done.current = true;
    if (typeof cards[0].animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    // The hand: below the middle of the grid's own width, at the bottom of the screen.
    const box = grid.getBoundingClientRect();
    const handX = box.left + box.width / 2;
    const handY = window.innerHeight + 40;

    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const dx = handX - (r.left + r.width / 2);
      const dy = handY - (r.top + r.height / 2);
      const tilt = dealTilt(i);
      card.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) rotate(${tilt * 2}deg) scale(1.1)`, opacity: 0, offset: 0 },
          { opacity: 1, offset: 0.25 },
          // Landing: in its cell, still a little big and turned, as it hits the table...
          { transform: `rotate(${tilt * 0.15}deg) scale(1.04)`, opacity: 1, offset: 0.72, easing: 'ease-out' },
          // ...and settling square.
          { transform: 'none', opacity: 1, offset: 1 },
        ],
        { duration: DURATION_MS, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', delay: dealDelay(i), fill: 'backwards' },
      );
    });
  }, [gridRef, ready]);
};
