import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers, EnhancedStore } from '@reduxjs/toolkit';
import casterInventoryReducer, { setActiveCoverFrame } from '../../store/casterInventorySlice';

// Mirrors useCompanionGiftAnnouncement.test.tsx's own setup (see that file for the full
// reasoning) -- a module-level "shown this page load" flag needs a fresh module per test,
// and the first render always goes through the dev bypass under vitest.
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-15T12:00:00')); // inside the Sep 12-26 gift window
});
afterEach(() => {
  vi.useRealTimers();
});

const importHook = () => import('../useCoverFrameGiftAnnouncement');

type Store = EnhancedStore<{ casterInventory: ReturnType<typeof casterInventoryReducer> }>;

const makeStore = (activeCoverFrameId: string | null = null): Store => {
  const store = configureStore({ reducer: combineReducers({ casterInventory: casterInventoryReducer }) });
  if (activeCoverFrameId) store.dispatch(setActiveCoverFrame(activeCoverFrameId));
  return store;
};

const wrapperFor = (store: Store) =>
  ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

describe('useCoverFrameGiftAnnouncement', () => {
  it('shows via the dev-only bypass on the first eligible mount, regardless of real eligibility', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    // Already the default -- realCondition would be false -- yet the dev bypass still
    // forces it open the first time this module sees an eligible mount.
    const store = makeStore('grimoire');

    const { result } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(true);
  });

  it('never shows when the caller passes enabled=false, and does not consume the dev bypass', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    const store = makeStore();

    const { result, unmount } = renderHook(() => useCoverFrameGiftAnnouncement(false), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(false);
    unmount();

    const { result: second } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(second.current.showModal).toBe(true);
  });

  it('only shows once per page load: a second, later mount does not re-trigger the bypass', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    const store = makeStore('grimoire'); // realCondition false (already the default)

    const { unmount } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    unmount();

    const { result } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(false);
  });

  it('after the bypass is consumed, shows via the real condition when actually eligible', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    const throwaway = makeStore('grimoire');
    const { unmount } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(throwaway) });
    unmount(); // consume the bypass using a throwaway (ineligible) store

    const store = makeStore(); // not the default, not activated, within window
    const { result } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(true);
  });

  it('after the bypass is consumed, does not show once the frame is already set as default', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    const throwaway = makeStore('grimoire');
    const { unmount } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(throwaway) });
    unmount();

    const store = makeStore('grimoire');
    const { result } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(false);
  });

  it('after the bypass is consumed, does not show once the gift has already been activated', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    const throwaway = makeStore('grimoire');
    const { unmount } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(throwaway) });
    unmount();

    localStorage.setItem('coverFrameGift:grimoire:activated', 'true');
    const store = makeStore();
    const { result } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(false);
  });

  it('after the bypass is consumed, does not show once the gift window has passed', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    const throwaway = makeStore('grimoire');
    const { unmount } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(throwaway) });
    unmount();

    vi.setSystemTime(new Date('2026-10-01T00:00:00'));
    const store = makeStore();
    const { result } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(false);
  });

  it('after the bypass is consumed, does not show before the gift window has started', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    const throwaway = makeStore('grimoire');
    const { unmount } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(throwaway) });
    unmount();

    vi.setSystemTime(new Date('2026-09-01T00:00:00'));
    const store = makeStore();
    const { result } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(false);
  });

  it('latches open: staying shown even if `enabled` later flips back to false', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    const store = makeStore('grimoire');

    const { result, rerender } = renderHook(({ enabled }) => useCoverFrameGiftAnnouncement(enabled), {
      wrapper: wrapperFor(store),
      initialProps: { enabled: true },
    });
    expect(result.current.showModal).toBe(true);

    rerender({ enabled: false });
    expect(result.current.showModal).toBe(true);
  });

  it('handleSetDefault sets the frame as the global default, persists activation, and closes the modal', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    const store = makeStore();

    const { result } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    act(() => { result.current.handleSetDefault(); });

    expect(store.getState().casterInventory.activeCoverFrameId).toBe('grimoire');
    expect(localStorage.getItem('coverFrameGift:grimoire:activated')).toBe('true');
    expect(result.current.showModal).toBe(false);
  });

  it('handleDismiss closes the modal without setting a default or persisting anything', async () => {
    const { useCoverFrameGiftAnnouncement } = await importHook();
    const store = makeStore();

    const { result } = renderHook(() => useCoverFrameGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    act(() => { result.current.handleDismiss(); });

    expect(store.getState().casterInventory.activeCoverFrameId).toBeNull();
    expect(localStorage.getItem('coverFrameGift:grimoire:activated')).toBeNull();
    expect(result.current.showModal).toBe(false);
  });
});
