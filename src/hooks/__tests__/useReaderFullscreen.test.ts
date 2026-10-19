import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReaderFullscreen } from '../useReaderFullscreen';

// The browser's Fullscreen API, as a browser that allows it (or turns it down) has it.
let fullscreenElement: Element | null = null;
const setFullscreenElement = (el: Element | null) => {
  fullscreenElement = el;
  document.dispatchEvent(new Event('fullscreenchange'));
};
const requestFullscreen = vi.fn(async () => { setFullscreenElement(document.documentElement); });
const exitFullscreen = vi.fn(async () => { setFullscreenElement(null); });

beforeEach(() => {
  fullscreenElement = null;
  requestFullscreen.mockClear().mockImplementation(async () => { setFullscreenElement(document.documentElement); });
  exitFullscreen.mockClear();
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen });
  Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: requestFullscreen });
});
afterEach(() => {
  delete (document as unknown as Record<string, unknown>).fullscreenElement;
  delete (document as unknown as Record<string, unknown>).fullscreenEnabled;
  delete (document as unknown as Record<string, unknown>).exitFullscreen;
  delete (document.documentElement as unknown as Record<string, unknown>).requestFullscreen;
});

const toggle = async (result: { current: ReturnType<typeof useReaderFullscreen> }) => {
  await act(async () => { result.current.toggle(); });
};

describe('useReaderFullscreen', () => {
  it("entering asks for the browser's fullscreen too; leaving leaves it", async () => {
    const { result } = renderHook(() => useReaderFullscreen());
    await toggle(result);
    expect(result.current.isFullscreen).toBe(true);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(fullscreenElement).toBe(document.documentElement);

    await toggle(result);
    expect(result.current.isFullscreen).toBe(false);
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
    expect(fullscreenElement).toBeNull();
  });

  it("leaving the browser's fullscreen another way (Esc) leaves the reader's mode too", async () => {
    const { result } = renderHook(() => useReaderFullscreen());
    await toggle(result);
    await act(async () => { setFullscreenElement(null); });
    expect(result.current.isFullscreen).toBe(false);
    // And entering again works as the first time.
    await toggle(result);
    expect(result.current.isFullscreen).toBe(true);
    expect(requestFullscreen).toHaveBeenCalledTimes(2);
  });

  it("a browser that turns it down keeps the reader's own mode", async () => {
    requestFullscreen.mockImplementation(async () => { throw new Error('denied'); });
    const { result } = renderHook(() => useReaderFullscreen());
    await toggle(result);
    expect(result.current.isFullscreen).toBe(true);
    await toggle(result);
    expect(result.current.isFullscreen).toBe(false);
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it("a browser without it (iOS Safari) keeps the reader's own mode, asking nothing", async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    const { result } = renderHook(() => useReaderFullscreen());
    await toggle(result);
    expect(result.current.isFullscreen).toBe(true);
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it("leaving the reader leaves the browser's fullscreen it asked for", async () => {
    const { result, unmount } = renderHook(() => useReaderFullscreen());
    await toggle(result);
    unmount();
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  // The browser can take a moment to answer: a caster who left before it did shouldn't be
  // left in the browser's fullscreen with the reader back to normal.
  describe('leaving before the browser answers', () => {
    let grant: () => void = () => {};
    beforeEach(() => {
      requestFullscreen.mockImplementation(() => new Promise<void>(resolve => {
        grant = () => { setFullscreenElement(document.documentElement); resolve(); };
      }));
    });

    it('leaves the fullscreen the browser grants late', async () => {
      const { result } = renderHook(() => useReaderFullscreen());
      await toggle(result);
      await toggle(result);
      expect(result.current.isFullscreen).toBe(false);
      await act(async () => { grant(); });
      expect(exitFullscreen).toHaveBeenCalledTimes(1);
      expect(fullscreenElement).toBeNull();
      expect(result.current.isFullscreen).toBe(false);
    });

    it('leaving the reader meanwhile leaves it too', async () => {
      const { result, unmount } = renderHook(() => useReaderFullscreen());
      await toggle(result);
      unmount();
      await act(async () => { grant(); });
      expect(exitFullscreen).toHaveBeenCalledTimes(1);
      expect(fullscreenElement).toBeNull();
    });
  });
});
