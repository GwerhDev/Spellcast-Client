import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers, EnhancedStore } from '@reduxjs/toolkit';
import userLibraryReducer, { unlockAsset } from '../../store/userLibrarySlice';

// This hook has a module-level "shown this page load" flag that must not leak
// between tests, and (see below) the FIRST render in a freshly-imported module
// always goes through the dev bypass in this test environment (import.meta.env.DEV
// is true under vitest) -- so each test resets the module fresh, and tests that
// need to exercise the REAL eligibility condition (not the dev bypass) render the
// hook a first, throwaway time to consume the bypass before the real assertion.
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-15T12:00:00')); // inside the Aug 10-30 gift window
});
afterEach(() => {
  vi.useRealTimers();
});

const importHook = () => import('../useCompanionGiftAnnouncement');

type Store = EnhancedStore<{ userLibrary: ReturnType<typeof userLibraryReducer> }>;

const makeStore = (unlockedIds: string[] = []): Store => {
  const store = configureStore({ reducer: combineReducers({ userLibrary: userLibraryReducer }) });
  for (const id of unlockedIds) store.dispatch(unlockAsset(id));
  return store;
};

const wrapperFor = (store: Store) =>
  ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

describe('useCompanionGiftAnnouncement', () => {
  it('shows via the dev-only bypass on the first eligible mount, regardless of real eligibility', async () => {
    const { useCompanionGiftAnnouncement } = await importHook();
    // Companion already unlocked -- realCondition would be false -- yet the dev
    // bypass still forces it open the first time this module sees an eligible mount.
    const store = makeStore(['cats']);

    const { result } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(true);
  });

  it('never shows when the caller passes enabled=false, and does not consume the dev bypass', async () => {
    const { useCompanionGiftAnnouncement } = await importHook();
    const store = makeStore();

    const { result, unmount } = renderHook(() => useCompanionGiftAnnouncement(false), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(false);
    unmount();

    // Bypass was never consumed (eligible was false throughout) -- a fresh mount
    // with enabled=true should still trigger it.
    const { result: second } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(second.current.showModal).toBe(true);
  });

  it('only shows once per page load: a second, later mount does not re-trigger the bypass', async () => {
    const { useCompanionGiftAnnouncement } = await importHook();
    const store = makeStore(['cats']); // realCondition false (already unlocked)

    const { unmount } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    unmount();

    // Bypass consumed by the mount above; realCondition is false (unlocked already),
    // so a fresh mount now should NOT show the modal.
    const { result } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(false);
  });

  it('after the bypass is consumed, shows via the real condition when actually eligible', async () => {
    const { useCompanionGiftAnnouncement } = await importHook();
    const throwaway = makeStore(['cats']);
    const { unmount } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(throwaway) });
    unmount(); // consume the bypass using a throwaway (ineligible) store

    const store = makeStore(); // not unlocked, not activated, within window
    const { result } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(true);
  });

  it('after the bypass is consumed, does not show once the companion is already activated', async () => {
    const { useCompanionGiftAnnouncement } = await importHook();
    const throwaway = makeStore(['cats']);
    const { unmount } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(throwaway) });
    unmount();

    localStorage.setItem('companionGift:cats:activated', 'true');
    const store = makeStore();
    const { result } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(false);
  });

  it('after the bypass is consumed, does not show once the gift window has passed', async () => {
    const { useCompanionGiftAnnouncement } = await importHook();
    const throwaway = makeStore(['cats']);
    const { unmount } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(throwaway) });
    unmount();

    vi.setSystemTime(new Date('2026-09-01T00:00:00'));
    const store = makeStore();
    const { result } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    expect(result.current.showModal).toBe(false);
  });

  it('latches open: staying shown even if `enabled` later flips back to false', async () => {
    const { useCompanionGiftAnnouncement } = await importHook();
    const store = makeStore(['cats']);

    const { result, rerender } = renderHook(({ enabled }) => useCompanionGiftAnnouncement(enabled), {
      wrapper: wrapperFor(store),
      initialProps: { enabled: true },
    });
    expect(result.current.showModal).toBe(true);

    rerender({ enabled: false });
    expect(result.current.showModal).toBe(true);
  });

  it('handleActivate unlocks and activates the companion, persists activation, and closes the modal', async () => {
    const { useCompanionGiftAnnouncement } = await importHook();
    const store = makeStore();

    const { result } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    act(() => { result.current.handleActivate(); });

    expect(store.getState().userLibrary.unlockedIds).toContain('cats');
    expect(store.getState().userLibrary.activeCompanionId).toBe('cats');
    expect(localStorage.getItem('companionGift:cats:activated')).toBe('true');
    expect(result.current.showModal).toBe(false);
  });

  it('handleDismiss closes the modal without unlocking, activating, or persisting anything', async () => {
    const { useCompanionGiftAnnouncement } = await importHook();
    const store = makeStore();

    const { result } = renderHook(() => useCompanionGiftAnnouncement(true), { wrapper: wrapperFor(store) });
    act(() => { result.current.handleDismiss(); });

    expect(store.getState().userLibrary.unlockedIds).not.toContain('cats');
    expect(localStorage.getItem('companionGift:cats:activated')).toBeNull();
    expect(result.current.showModal).toBe(false);
  });
});
