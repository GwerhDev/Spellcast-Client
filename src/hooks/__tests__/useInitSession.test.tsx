import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import sessionReducer from '../../store/sessionSlice';
import apiResponsesReducer from '../../store/apiResponsesSlice';
import credentialsReducer from '../../store/credentialsSlice';
import voiceReducer from '../../store/voiceSlice';

const fetchAuthMock = vi.fn();
vi.mock('../../services/auth', () => ({
  fetchAuth: (...args: unknown[]) => fetchAuthMock(...args),
}));

const getCredentialsServiceMock = vi.fn();
vi.mock('../../services/credentials', () => ({
  getCredentials: (...args: unknown[]) => getCredentialsServiceMock(...args),
}));

const getVoicePreferenceMock = vi.fn();
vi.mock('../../db/preferences', () => ({
  getVoicePreference: (...args: unknown[]) => getVoicePreferenceMock(...args),
}));

const { useInitSession } = await import('../useInitSession');

const makeStore = () => configureStore({
  reducer: combineReducers({
    session: sessionReducer,
    apiResponses: apiResponsesReducer,
    credentials: credentialsReducer,
    voice: voiceReducer,
  }),
});

const renderInitSession = (store: ReturnType<typeof makeStore>, onProgress?: (p: number) => void, onMessage?: (m: string) => void) =>
  renderHook(() => useInitSession(onProgress, onMessage), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });

const originalLocation = window.location;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  getCredentialsServiceMock.mockResolvedValue([]);
  getVoicePreferenceMock.mockResolvedValue(null);
  Object.defineProperty(window, 'location', { writable: true, configurable: true, value: { href: 'http://localhost:5173/' } });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'location', { writable: true, configurable: true, value: originalLocation });
});

describe('useInitSession', () => {
  it('on successful auth: stores the session, fetches credentials/voice preference, and clears the loader', async () => {
    fetchAuthMock.mockResolvedValue({
      logged: true,
      userData: { id: 'user-1', current_credential: 'cred-1' },
    });
    const store = makeStore();
    const onProgress = vi.fn();
    const onMessage = vi.fn();

    renderInitSession(store, onProgress, onMessage);
    expect(store.getState().session.userData.loader).toBe(true);
    expect(onProgress).toHaveBeenCalledWith(0);
    expect(onMessage).toHaveBeenCalledWith('Authenticating...');

    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    // loader itself lives inside userData, and settles to false via the trailing
    // setLoader(false) dispatch -- both merge into the same object.
    expect(store.getState().session).toEqual({ logged: true, userData: { id: 'user-1', current_credential: 'cred-1', loader: false } });
    expect(store.getState().credentials.currentCredentialId).toBe('cred-1');
    expect(getCredentialsServiceMock).toHaveBeenCalledTimes(1);
    expect(getVoicePreferenceMock).toHaveBeenCalledWith('user-1');
    expect(onProgress).toHaveBeenCalledWith(60);
    expect(onProgress).toHaveBeenCalledWith(100);
    expect(onMessage).toHaveBeenCalledWith('');
    expect(store.getState().apiResponses.responses.some((r) => r.type === 'success')).toBe(true);
  });

  it('requests persistent storage on successful auth, so the browser stops treating IndexedDB as evictable', async () => {
    // Production data loss (spells vanishing) was traced to IndexedDB never
    // being granted persistent storage -- the browser's default "best-effort"
    // bucket can be silently evicted under disk pressure.
    fetchAuthMock.mockResolvedValue({ logged: true, userData: { id: 'user-1' } });
    const persistMock = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { ...navigator, storage: { ...navigator.storage, persist: persistMock } });
    const store = makeStore();

    renderInitSession(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    expect(persistMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('does not throw if navigator.storage is unsupported', async () => {
    fetchAuthMock.mockResolvedValue({ logged: true, userData: { id: 'user-1' } });
    vi.stubGlobal('navigator', { ...navigator, storage: undefined });
    const store = makeStore();

    renderInitSession(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    expect(store.getState().session.logged).toBe(true); // the rest of init still completed
    vi.unstubAllGlobals();
  });

  it('on failed auth: reports an error, redirects to login, and never touches session/credentials state', async () => {
    fetchAuthMock.mockResolvedValue({ logged: false });
    const store = makeStore();

    renderInitSession(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    expect(window.location.href).toContain('/login?callback=');
    expect(store.getState().apiResponses.responses.some((r) => r.type === 'error')).toBe(true);
    expect(getCredentialsServiceMock).not.toHaveBeenCalled();
    expect(getVoicePreferenceMock).not.toHaveBeenCalled();
    // setSession is never dispatched on failure -- session stays at its initial shape
    // (still logged out), only the loader's own lifecycle touches it.
    expect(store.getState().session.logged).toBe(false);
  });

  it('does not attempt to load a voice preference when the session has no user id', async () => {
    fetchAuthMock.mockResolvedValue({ logged: true, userData: {} });
    const store = makeStore();

    renderInitSession(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    expect(getVoicePreferenceMock).not.toHaveBeenCalled();
    expect(store.getState().session.logged).toBe(true);
  });

  it('sets currentCredentialId to null when the profile has no active credential', async () => {
    fetchAuthMock.mockResolvedValue({ logged: true, userData: { id: 'user-1' } });
    const store = makeStore();

    renderInitSession(store);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    expect(store.getState().credentials.currentCredentialId).toBeNull();
  });
});
