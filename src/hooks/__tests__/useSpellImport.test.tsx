import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import sessionReducer from '../../store/sessionSlice';
import apiResponsesReducer from '../../store/apiResponsesSlice';
import spellReaderReducer from '../../store/spellReaderSlice';
import { LanguageProvider } from '../../i18n';

const importSpellFromFileMock = vi.fn();
vi.mock('../../utils/spellFormat', () => ({
  importSpellFromFile: (...args: unknown[]) => importSpellFromFileMock(...args),
}));

const { useSpellImport } = await import('../useSpellImport');

const makeStore = (userId: string | undefined) => {
  const store = configureStore({
    reducer: combineReducers({
      session: sessionReducer,
      apiResponses: apiResponsesReducer,
      spellReader: spellReaderReducer,
    }),
  });
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { loader: false, id: userId } } });
  return store;
};

const renderImport = (store: ReturnType<typeof makeStore>) =>
  renderHook(() => useSpellImport(), {
    wrapper: ({ children }) => (
      <Provider store={store}>
        <LanguageProvider>{children}</LanguageProvider>
      </Provider>
    ),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSpellImport', () => {
  it('imports the given file, invalidates the spell list, and reports success', async () => {
    importSpellFromFileMock.mockResolvedValue('new-spell-id');
    const store = makeStore('user-1');
    const { result } = renderImport(store);

    const file = new File(['zip-bytes'], 'My Book.spell');
    await act(async () => { await result.current.importFile(file); });

    expect(importSpellFromFileMock).toHaveBeenCalledWith(file, 'user-1');
    expect(store.getState().spellReader.listVersion).toBe(1);
    const responses = store.getState().apiResponses.responses;
    expect(responses).toHaveLength(1);
    expect(responses[0].type).toBe('success');
    expect(responses[0].message).toContain('My Book');
    expect(result.current.isImporting).toBe(false);
  });

  it('reports an error and does not invalidate the list when import fails', async () => {
    importSpellFromFileMock.mockRejectedValue(new Error('bad zip'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = makeStore('user-1');
    const { result } = renderImport(store);

    const file = new File(['garbage'], 'Broken.spell');
    await act(async () => { await result.current.importFile(file); });

    expect(store.getState().spellReader.listVersion).toBe(0);
    const responses = store.getState().apiResponses.responses;
    expect(responses).toHaveLength(1);
    expect(responses[0].type).toBe('error');
    expect(result.current.isImporting).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it('does nothing when there is no logged-in user id', async () => {
    const store = makeStore(undefined);
    const { result } = renderImport(store);

    const file = new File(['x'], 'x.spell');
    await act(async () => { await result.current.importFile(file); });

    expect(importSpellFromFileMock).not.toHaveBeenCalled();
    expect(store.getState().apiResponses.responses).toHaveLength(0);
  });

  it('sets isImporting to true while the import is in flight', async () => {
    let resolveImport: (id: string) => void;
    importSpellFromFileMock.mockReturnValue(new Promise((resolve) => { resolveImport = resolve; }));
    const store = makeStore('user-1');
    const { result } = renderImport(store);

    let importPromise!: Promise<void>;
    act(() => { importPromise = result.current.importFile(new File(['x'], 'x.spell')); });
    expect(result.current.isImporting).toBe(true);

    await act(async () => { resolveImport!('new-id'); await importPromise; });
    expect(result.current.isImporting).toBe(false);
  });
});
