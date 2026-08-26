import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useInfiniteList } from '../useInfiniteList';

// happy-dom has no working IntersectionObserver -- this mock captures the callback
// per instance so a test can fire it manually to simulate the sentinel scrolling
// into view, and records disconnect() to verify cleanup wiring.
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

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// A real component, so the sentinel <div ref={...}> is genuinely attached by React
// during the commit phase BEFORE useInfiniteList's own effect runs on mount --
// unlike renderHook, which never mounts any JSX the hook's ref is meant to attach to.
let latestResult: ReturnType<typeof useInfiniteList<number>>;
function Harness({ items, pageSize }: { items: number[]; pageSize: number }) {
  latestResult = useInfiniteList(items, pageSize);
  return <div ref={latestResult.sentinelRef} data-testid="sentinel" />;
}

const renderList = (items: number[], pageSize = 20) => render(<Harness items={items} pageSize={pageSize} />);

describe('useInfiniteList', () => {
  it('shows only the first page of items by default', () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    renderList(items, 20);
    expect(latestResult.visible).toEqual(items.slice(0, 20));
    expect(latestResult.hasMore).toBe(true);
  });

  it('shows all items and reports hasMore=false when there are fewer than one page', () => {
    const items = [1, 2, 3];
    renderList(items, 20);
    expect(latestResult.visible).toEqual(items);
    expect(latestResult.hasMore).toBe(false);
  });

  it('grows the visible slice by one page when the sentinel intersects', () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    renderList(items, 20);

    act(() => { MockIntersectionObserver.instances.at(-1)!.trigger(true); });
    expect(latestResult.visible).toEqual(items.slice(0, 40));
    expect(latestResult.hasMore).toBe(true);
  });

  it('never grows past the total item count, and hasMore becomes false at the end', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    renderList(items, 20);

    act(() => { MockIntersectionObserver.instances.at(-1)!.trigger(true); });
    expect(latestResult.visible).toEqual(items); // capped at 25, not 40
    expect(latestResult.hasMore).toBe(false);
  });

  it('does not grow when the sentinel entry reports isIntersecting=false', () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    renderList(items, 20);

    act(() => { MockIntersectionObserver.instances.at(-1)!.trigger(false); });
    expect(latestResult.visible).toEqual(items.slice(0, 20));
  });

  it('resets pagination back to one page when the items array identity changes', () => {
    const firstItems = Array.from({ length: 45 }, (_, i) => i);
    const { rerender } = renderList(firstItems, 20);
    act(() => { MockIntersectionObserver.instances.at(-1)!.trigger(true); });
    expect(latestResult.visible).toHaveLength(40);

    // A new (shorter) result set replaces the list -- must not stay stuck showing
    // a stale 40-item slice bigger than the new list itself.
    const newItems = Array.from({ length: 10 }, (_, i) => i + 100);
    rerender(<Harness items={newItems} pageSize={20} />);
    expect(latestResult.visible).toEqual(newItems);
    expect(latestResult.hasMore).toBe(false);
  });

  it('disconnects the observer on unmount', () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    const { unmount } = renderList(items, 20);

    const observer = MockIntersectionObserver.instances.at(-1)!;
    unmount();
    expect(observer.disconnected).toBe(true);
  });
});
