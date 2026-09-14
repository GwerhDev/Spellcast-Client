import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCoverFrame3DInvalidate } from '../useCoverFrame3DInvalidate';

const invalidateMock = vi.fn();
vi.mock('@react-three/fiber', () => ({ invalidate: () => invalidateMock() }));

// Manual, id-tracked requestAnimationFrame mock (unlike vitest's fake timers, this lets a
// test assert on cancelAnimationFrame actually removing a still-pending callback, which
// this hook's cleanup and its own stopAt-based loop both rely on).
let rafQueue: Map<number, FrameRequestCallback>;
let nextRafId: number;
const flushRAF = () => {
  const entries = [...rafQueue.entries()];
  rafQueue.clear();
  entries.forEach(([, cb]) => cb(performance.now()));
};

const originalRAF = window.requestAnimationFrame;
const originalCAF = window.cancelAnimationFrame;

beforeEach(() => {
  invalidateMock.mockClear();
  rafQueue = new Map();
  nextRafId = 1;
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    const id = nextRafId++;
    rafQueue.set(id, cb);
    return id;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = ((id: number) => { rafQueue.delete(id); }) as typeof window.cancelAnimationFrame;
});

afterEach(() => {
  window.requestAnimationFrame = originalRAF;
  window.cancelAnimationFrame = originalCAF;
});

// TransitionEvent isn't guaranteed to exist in the test DOM implementation -- build a
// plain Event and stamp `propertyName` on it, which is all this hook actually reads.
const makeTransitionEvent = (type: string, propertyName: string): Event => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  return event;
};

describe('useCoverFrame3DInvalidate', () => {
  it('invalidates on a window resize', () => {
    renderHook(() => useCoverFrame3DInvalidate());
    window.dispatchEvent(new Event('resize'));
    expect(invalidateMock).toHaveBeenCalledTimes(1);
  });

  it('invalidates on a scroll fired anywhere in the document (capture phase)', () => {
    renderHook(() => useCoverFrame3DInvalidate());
    const inner = document.createElement('div');
    document.body.appendChild(inner);
    inner.dispatchEvent(new Event('scroll'));
    expect(invalidateMock).toHaveBeenCalledTimes(1);
    inner.remove();
  });

  it('keeps invalidating every frame while a layout-affecting transition is running', () => {
    renderHook(() => useCoverFrame3DInvalidate());
    document.dispatchEvent(makeTransitionEvent('transitionrun', 'width'));
    expect(invalidateMock).not.toHaveBeenCalled(); // only schedules a frame, doesn't render synchronously
    expect(rafQueue.size).toBe(1);

    flushRAF();
    expect(invalidateMock).toHaveBeenCalledTimes(1);
    flushRAF();
    expect(invalidateMock).toHaveBeenCalledTimes(2);
  });

  it('ignores a transition on a property that never moves anything (e.g. color)', () => {
    renderHook(() => useCoverFrame3DInvalidate());
    document.dispatchEvent(makeTransitionEvent('transitionrun', 'color'));
    expect(invalidateMock).not.toHaveBeenCalled();
    expect(rafQueue.size).toBe(0);
  });

  it('stops the render loop once the layout transition ends', () => {
    renderHook(() => useCoverFrame3DInvalidate());
    document.dispatchEvent(makeTransitionEvent('transitionrun', 'width'));
    flushRAF();
    invalidateMock.mockClear();

    document.dispatchEvent(makeTransitionEvent('transitionend', 'width'));
    flushRAF(); // the tick already scheduled before transitionend still renders once more...
    expect(invalidateMock).toHaveBeenCalledTimes(1);
    invalidateMock.mockClear();

    flushRAF(); // ...but no further frame gets scheduled after that
    expect(invalidateMock).not.toHaveBeenCalled();
    expect(rafQueue.size).toBe(0);
  });

  it('keeps running while any of several overlapping layout transitions is still active', () => {
    renderHook(() => useCoverFrame3DInvalidate());
    document.dispatchEvent(makeTransitionEvent('transitionrun', 'width'));
    document.dispatchEvent(makeTransitionEvent('transitionrun', 'transform'));
    flushRAF();
    invalidateMock.mockClear();

    document.dispatchEvent(makeTransitionEvent('transitionend', 'width'));
    flushRAF(); // 'transform' is still running -- must keep going
    expect(rafQueue.size).toBe(1);

    document.dispatchEvent(makeTransitionEvent('transitioncancel', 'transform'));
    flushRAF();
    expect(rafQueue.size).toBe(0);
  });

  it('removes its listeners and cancels any pending frame on unmount', () => {
    const { unmount } = renderHook(() => useCoverFrame3DInvalidate());
    document.dispatchEvent(makeTransitionEvent('transitionrun', 'width'));
    expect(rafQueue.size).toBe(1);

    unmount();
    expect(rafQueue.size).toBe(0);

    invalidateMock.mockClear();
    window.dispatchEvent(new Event('resize'));
    expect(invalidateMock).not.toHaveBeenCalled();
  });
});
