import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePointerIdle } from '../usePointerIdle';

describe('usePointerIdle', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('turns idle once the pointer is left alone for the delay', () => {
    const { result } = renderHook(() => usePointerIdle(3000));
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(2999); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(true);
  });

  it('any activity wakes it right away and restarts the countdown', () => {
    const { result } = renderHook(() => usePointerIdle(3000));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current).toBe(true);
    act(() => { window.dispatchEvent(new MouseEvent('mousemove')); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown')); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(true);
  });

  it('is never idle while disabled', () => {
    const { result, rerender } = renderHook(({ enabled }) => usePointerIdle(3000, enabled), { initialProps: { enabled: true } });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current).toBe(true);
    rerender({ enabled: false });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current).toBe(false);
  });
});
