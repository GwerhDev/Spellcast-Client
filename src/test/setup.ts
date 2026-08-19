import '@testing-library/jest-dom';

// Deterministic ResizeObserver stub (never fires) so components that observe elements —
// e.g. CompanionOverlay measuring its overlay — don't depend on the DOM env's own
// implementation or timing.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// The test DOM has no real viewport model, so width-based media queries always resolve to
// `matches: false`. Stub it so tests can opt into "matches: true" per query (see
// src/test/mockMatchMedia.ts) to exercise mobile-breakpoint code paths.
window.matchMedia = window.matchMedia || ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}) as unknown as MediaQueryList);
