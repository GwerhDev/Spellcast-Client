// Where a page scrolls: a box inside the window (the desktop layout, and the routes that keep
// their own scroller), or the document itself (a page of sections on a phone, see globals.css).

// The nearest ancestor that scrolls, or null when it's the document.
export const scrollParentOf = (el: HTMLElement | null): HTMLElement | null => {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
};

// How far down from the window's top what sticks to the page's top sits (under the header,
// when the document scrolls), in px: --page-sticky-top, none when it isn't set.
export const pageStickyTop = (): number => {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-sticky-top'));
  return Number.isFinite(value) ? value : 0;
};
