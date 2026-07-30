import '@testing-library/jest-dom';

// ResizeObserver is not implemented in jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// jsdom has no viewport model, so its real matchMedia always resolves width-based
// queries to `matches: false`. Stub it so tests can opt into "matches: true" per query
// (see src/test/mockMatchMedia.ts) to exercise mobile-breakpoint code paths.
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
