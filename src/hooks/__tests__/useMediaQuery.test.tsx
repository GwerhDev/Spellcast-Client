import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

// A controllable MediaQueryList mock, unlike src/test/mockMatchMedia.ts's static
// version -- this one lets a test actually fire 'change' events to verify
// useMediaQuery's listener wiring, not just its initial read.
class MockMediaQueryList extends EventTarget {
  matches: boolean;
  media: string;
  constructor(media: string, matches: boolean) {
    super();
    this.media = media;
    this.matches = matches;
  }
  setMatches(value: boolean) {
    this.matches = value;
    this.dispatchEvent(new Event('change'));
  }
}

const instances = new Map<string, MockMediaQueryList>();
const originalMatchMedia = window.matchMedia;

const mockMatchMediaControllable = (initial: Record<string, boolean>) => {
  instances.clear();
  window.matchMedia = ((query: string) => {
    const mql = new MockMediaQueryList(query, initial[query] ?? false);
    instances.set(query, mql);
    return mql as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
};

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  instances.clear();
});

describe('useMediaQuery', () => {
  it('returns the initial match state synchronously', () => {
    mockMatchMediaControllable({ '(max-width: 600px)': true });
    const { result } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(true);
  });

  it('returns false when the query does not match', () => {
    mockMatchMediaControllable({ '(max-width: 600px)': false });
    const { result } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(false);
  });

  it('updates when the underlying media query list fires a change event', () => {
    mockMatchMediaControllable({ '(max-width: 600px)': false });
    const { result } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(false);

    act(() => { instances.get('(max-width: 600px)')!.setMatches(true); });
    expect(result.current).toBe(true);

    act(() => { instances.get('(max-width: 600px)')!.setMatches(false); });
    expect(result.current).toBe(false);
  });

  it('re-subscribes to a new query when the query string prop changes', () => {
    mockMatchMediaControllable({ '(max-width: 600px)': false, '(min-width: 1200px)': true });
    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: '(max-width: 600px)' },
    });
    expect(result.current).toBe(false);

    rerender({ query: '(min-width: 1200px)' });
    expect(result.current).toBe(true);
  });

  it('removes its change listener on unmount', () => {
    mockMatchMediaControllable({ '(max-width: 600px)': false });
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    const mql = instances.get('(max-width: 600px)')!;
    const removeSpy = vi.spyOn(mql, 'removeEventListener');

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
