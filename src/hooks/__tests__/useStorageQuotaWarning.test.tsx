import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import apiResponsesReducer from '../../store/apiResponsesSlice';
import { LanguageProvider } from '../../i18n';
import { useStorageQuotaWarning } from '../useStorageQuotaWarning';
import type { StorageEstimate } from '../../utils/storageQuota';

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
});
