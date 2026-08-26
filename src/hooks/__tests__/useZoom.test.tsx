import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useZoom } from '../useZoom';

const fireWheel = (target: Element, deltaY: number, ctrlKey = true) => {
  const event = new WheelEvent('wheel', { deltaY, cancelable: true, bubbles: true });
  // happy-dom's WheelEvent constructor doesn't wire up ctrlKey from its init dict
  // (it comes back undefined regardless of what's passed) -- define it directly so
  // the hook's `if (!e.ctrlKey) return` check sees a real value, matching what a
  // real browser's WheelEvent constructor already does correctly.
  Object.defineProperty(event, 'ctrlKey', { value: ctrlKey, configurable: true });
  target.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const renderZoomOnContainer = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const child = document.createElement('span');
  container.appendChild(child);
  const { result } = renderHook(() => {
    const ref = useRef<HTMLDivElement | null>(container);
    return useZoom(ref);
  });
  return { result, container, child };
};

describe('useZoom', () => {
  it('starts at 1.0x zoom with the indicator hidden', () => {
    const { result } = renderZoomOnContainer();
    expect(result.current.zoom).toBe(1.0);
    expect(result.current.showIndicator).toBe(false);
  });

  it('adjustZoom increases/decreases by the delta, clamped to one decimal place', () => {
    const { result } = renderZoomOnContainer();
    act(() => { result.current.adjustZoom(0.1); });
    expect(result.current.zoom).toBeCloseTo(1.1);
    act(() => { result.current.adjustZoom(-0.2); });
    expect(result.current.zoom).toBeCloseTo(0.9);
  });

  it('clamps zoom to the [0.25, 2.0] range', () => {
    const { result } = renderZoomOnContainer();
    for (let i = 0; i < 30; i++) act(() => { result.current.adjustZoom(-0.1); });
    expect(result.current.zoom).toBe(0.25);
    for (let i = 0; i < 30; i++) act(() => { result.current.adjustZoom(0.1); });
    expect(result.current.zoom).toBe(2.0);
  });

  it('resetZoom returns to 1.0x from any level', () => {
    const { result } = renderZoomOnContainer();
    act(() => { result.current.adjustZoom(0.5); });
    expect(result.current.zoom).not.toBe(1.0);
    act(() => { result.current.resetZoom(); });
    expect(result.current.zoom).toBe(1.0);
  });

  it('shows the indicator after a zoom change, then hides it again after 1s', () => {
    const { result } = renderZoomOnContainer();
    act(() => { result.current.adjustZoom(0.1); });
    expect(result.current.showIndicator).toBe(true);

    act(() => { vi.advanceTimersByTime(999); });
    expect(result.current.showIndicator).toBe(true);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.showIndicator).toBe(false);
  });

  it('resets the 1s hide timer on a second zoom change before it fires', () => {
    const { result } = renderZoomOnContainer();
    act(() => { result.current.adjustZoom(0.1); });
    act(() => { vi.advanceTimersByTime(800); });
    act(() => { result.current.adjustZoom(0.1); }); // resets the timer
    act(() => { vi.advanceTimersByTime(800); }); // 1600ms since the first change, but only 800 since the second
    expect(result.current.showIndicator).toBe(true);
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.showIndicator).toBe(false);
  });

  it('ctrl+wheel over the container zooms in/out and prevents default page scroll/zoom', () => {
    const { result, child } = renderZoomOnContainer();

    let event!: WheelEvent;
    act(() => { event = fireWheel(child, -100, true); }); // scrolling "up" zooms in
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.zoom).toBeCloseTo(1.1);

    act(() => { fireWheel(child, 100, true); }); // scrolling "down" zooms out
    expect(result.current.zoom).toBeCloseTo(1.0);
  });

  it('plain wheel (no ctrlKey) is ignored', () => {
    const { result, child } = renderZoomOnContainer();
    let event!: WheelEvent;
    act(() => { event = fireWheel(child, -100, false); });
    expect(event.defaultPrevented).toBe(false);
    expect(result.current.zoom).toBe(1.0);
  });

  it('ctrl+wheel outside the container is ignored', () => {
    const { result } = renderZoomOnContainer();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    act(() => { fireWheel(outside, -100, true); });
    expect(result.current.zoom).toBe(1.0);
  });
});
