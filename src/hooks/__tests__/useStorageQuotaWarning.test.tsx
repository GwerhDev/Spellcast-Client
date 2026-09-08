import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import apiResponsesReducer from '../../store/apiResponsesSlice';
import { LanguageProvider } from '../../i18n';
import { AUDIO_CACHE_AUTO_CLEANUP_KEY } from '../../db/audioCache';
import type { StorageEstimate } from '../../utils/storageQuota';

const evictLeastRecentlyUsedAudioMock = vi.fn();
vi.mock('../../db/audioCache', async () => {
  const actual = await vi.importActual<typeof import('../../db/audioCache')>('../../db/audioCache');
  return { ...actual, evictLeastRecentlyUsedAudio: (...args: unknown[]) => evictLeastRecentlyUsedAudioMock(...args) };
});

const { useStorageQuotaWarning } = await import('../useStorageQuotaWarning');

const makeStore = () => configureStore({
  reducer: combineReducers({ apiResponses: apiResponsesReducer }),
});

const renderQuotaWarning = (store: ReturnType<typeof makeStore>) =>
  renderHook(() => useStorageQuotaWarning(), {
    wrapper: ({ children }) => (
      <Provider store={store}>
        <LanguageProvider>{children}</LanguageProvider>
      </Provider>
    ),
  });

const originalStorage = navigator.storage;

const stubStorageEstimate = (estimate: Partial<StorageEstimate> | undefined) => {
  Object.defineProperty(navigator, 'storage', {
    value: estimate === undefined ? undefined : { estimate: vi.fn().mockResolvedValue(estimate) },
    configurable: true,
  });
};

beforeEach(() => {
  localStorage.clear();
  evictLeastRecentlyUsedAudioMock.mockReset();
});

afterEach(() => {
  Object.defineProperty(navigator, 'storage', { value: originalStorage, configurable: true });
});

describe('useStorageQuotaWarning', () => {
  it('dispatches a warning toast when usage is at or above 85% of quota', async () => {
    stubStorageEstimate({ usage: 90, quota: 100 });
    const store = makeStore();
    renderQuotaWarning(store);

    await waitFor(() => {
      expect(store.getState().apiResponses.responses).toHaveLength(1);
    });
    expect(store.getState().apiResponses.responses[0].type).toBe('error');
  });

  it('does not warn when usage is comfortably below the threshold', async () => {
    stubStorageEstimate({ usage: 10, quota: 100 });
    const store = makeStore();
    renderQuotaWarning(store);

    await new Promise((r) => setTimeout(r, 0));
    expect(store.getState().apiResponses.responses).toHaveLength(0);
  });

  it('does nothing when the Storage API is unavailable', async () => {
    stubStorageEstimate(undefined);
    const store = makeStore();
    renderQuotaWarning(store);

    await new Promise((r) => setTimeout(r, 0));
    expect(store.getState().apiResponses.responses).toHaveLength(0);
  });

  describe('audio-cache auto-cleanup (TCORE-118)', () => {
    it('does not evict anything when the setting is off (default)', async () => {
      stubStorageEstimate({ usage: 90, quota: 100 });
      const store = makeStore();
      renderQuotaWarning(store);

      await waitFor(() => expect(store.getState().apiResponses.responses).toHaveLength(1));
      expect(evictLeastRecentlyUsedAudioMock).not.toHaveBeenCalled();
      expect(store.getState().apiResponses.responses[0].type).toBe('error');
    });

    it('evicts audio and shows only the success toast when it fully covers the target', async () => {
      localStorage.setItem(AUDIO_CACHE_AUTO_CLEANUP_KEY, 'true');
      stubStorageEstimate({ usage: 90, quota: 100 });
      // target = 90 - 0.75*100 = 15; freeing exactly that covers it.
      evictLeastRecentlyUsedAudioMock.mockResolvedValue(15);
      const store = makeStore();
      renderQuotaWarning(store);

      await waitFor(() => expect(store.getState().apiResponses.responses).toHaveLength(1));
      expect(evictLeastRecentlyUsedAudioMock).toHaveBeenCalledWith(15);
      const [toast] = store.getState().apiResponses.responses;
      expect(toast.type).toBe('success');
      expect(toast.message).not.toBe('');
    });

    it('shows both toasts when the audio cache alone cannot cover the target', async () => {
      localStorage.setItem(AUDIO_CACHE_AUTO_CLEANUP_KEY, 'true');
      stubStorageEstimate({ usage: 90, quota: 100 });
      evictLeastRecentlyUsedAudioMock.mockResolvedValue(5); // less than the 15 needed
      const store = makeStore();
      renderQuotaWarning(store);

      await waitFor(() => expect(store.getState().apiResponses.responses).toHaveLength(2));
      const types = store.getState().apiResponses.responses.map((r) => r.type);
      expect(types).toEqual(['success', 'error']);
    });

    it('shows only the warning when auto-cleanup is enabled but nothing could be freed', async () => {
      localStorage.setItem(AUDIO_CACHE_AUTO_CLEANUP_KEY, 'true');
      stubStorageEstimate({ usage: 90, quota: 100 });
      evictLeastRecentlyUsedAudioMock.mockResolvedValue(0);
      const store = makeStore();
      renderQuotaWarning(store);

      await waitFor(() => expect(store.getState().apiResponses.responses).toHaveLength(1));
      expect(store.getState().apiResponses.responses[0].type).toBe('error');
    });
  });
});
