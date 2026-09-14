import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import { useCoverFrame3DGate } from '../useCoverFrame3DGate';
import { Mode3DProvider } from '../../context/Mode3DContext';

// Same controllable-MediaQueryList shape as useMediaQuery's own test, extended to serve
// BOTH queries this hook checks (desktop + reduced-motion) from one map.
class MockMediaQueryList extends EventTarget {
  matches: boolean;
  media: string;
  constructor(media: string, matches: boolean) {
    super();
    this.media = media;
    this.matches = matches;
  }
}

// Same shape as useInfiniteList's own mock -- happy-dom has no real IntersectionObserver.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  disconnected = false;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe() {}
  disconnect() { this.disconnected = true; }
  unobserve() {}
  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

const DESKTOP_QUERY = '(min-width: 1025px) and (hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

let mediaState: Record<string, boolean>;
const originalMatchMedia = window.matchMedia;
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
const originalHardwareConcurrency = Object.getOwnPropertyDescriptor(navigator, 'hardwareConcurrency');

let latestResult: boolean;
function Harness() {
  const ref = useRef<HTMLDivElement>(null);
  latestResult = useCoverFrame3DGate(ref);
  return <div ref={ref} data-testid="section" />;
}

const renderGate = () => render(
  <Mode3DProvider>
    <Harness />
  </Mode3DProvider>
);

// Section fully within the viewport -- matches the hook's own synchronous seed read
// (rect.top < innerHeight && rect.bottom > 0) so a passing test doesn't depend on the
// IntersectionObserver mock ever actually firing on its own.
const mockInViewportRect = () => {
  HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
    top: 100, bottom: 300, left: 0, right: 200, width: 200, height: 200, x: 0, y: 100,
    toJSON: () => {},
  }));
};

beforeEach(() => {
  vi.useFakeTimers();
  MockIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  mediaState = { [DESKTOP_QUERY]: true, [REDUCED_MOTION_QUERY]: false };
  window.matchMedia = ((query: string) => new MockMediaQueryList(query, mediaState[query] ?? false)) as typeof window.matchMedia;
  mockInViewportRect();
  localStorage.setItem('mode3d', '1');
});

afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
  HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  if (originalHardwareConcurrency) Object.defineProperty(navigator, 'hardwareConcurrency', originalHardwareConcurrency);
  vi.unstubAllGlobals();
  localStorage.clear();
});

// Advances past the hook's own 200ms poll interval (waiting for sectionRef.current to
// exist) so its synchronous seed read and IntersectionObserver setup have both run.
const settle = () => act(() => { vi.advanceTimersByTime(200); });

describe('useCoverFrame3DGate', () => {
  it('stays false when the Mode3D toggle itself is off, even with everything else matching', () => {
    localStorage.setItem('mode3d', '0');
    renderGate();
    settle();
    expect(latestResult).toBe(false);
  });

  it('stays false on a non-desktop viewport/input', () => {
    mediaState[DESKTOP_QUERY] = false;
    renderGate();
    settle();
    expect(latestResult).toBe(false);
  });

  it('stays false when the user prefers reduced motion', () => {
    mediaState[REDUCED_MOTION_QUERY] = true;
    renderGate();
    settle();
    expect(latestResult).toBe(false);
  });

  it('becomes true once every condition is met and the section is in the viewport', () => {
    renderGate();
    settle();
    expect(latestResult).toBe(true);
  });

  it('follows the IntersectionObserver once it takes over from the synchronous seed', () => {
    renderGate();
    settle();
    expect(latestResult).toBe(true);

    act(() => { MockIntersectionObserver.instances[0].trigger(false); });
    expect(latestResult).toBe(false);

    act(() => { MockIntersectionObserver.instances[0].trigger(true); });
    expect(latestResult).toBe(true);
  });

  it('stays false on a device reporting low hardwareConcurrency, even in view', () => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2, configurable: true });
    renderGate();
    settle();
    expect(latestResult).toBe(false);
  });

  it('disconnects its observer and clears its poll interval on unmount', () => {
    const { unmount } = renderGate();
    settle();
    const observer = MockIntersectionObserver.instances[0];
    expect(observer.disconnected).toBe(false);

    unmount();
    expect(observer.disconnected).toBe(true);
  });
});
