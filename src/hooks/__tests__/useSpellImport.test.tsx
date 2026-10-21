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

// The caster's access keys (off until their account keeps them): one, to test an import is
// wired to open a file with it.
const KEY = { id: 'key-1', key: new Uint8Array(32).fill(7) };
vi.mock('../../services/accessKeys', () => ({ accessKeys: async () => [KEY] }));

const { useSpellImport } = await import('../useSpellImport');
const { SpellLockedError } = await import('../../utils/spellProtection');

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

    expect(importSpellFromFileMock).toHaveBeenCalledWith(file, 'user-1', { keys: expect.any(Array), password: undefined });
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

    let importPromise!: Promise<string | null | undefined>;
    act(() => { importPromise = result.current.importFile(new File(['x'], 'x.spell')); });
    expect(result.current.isImporting).toBe(true);

    await act(async () => { resolveImport!('new-id'); await importPromise; });
    expect(result.current.isImporting).toBe(false);
  });

  it('resolves to the new spell id, or null when the import fails', async () => {
    const store = makeStore('user-1');
    const { result } = renderImport(store);
    importSpellFromFileMock.mockResolvedValueOnce('new-id');
    await act(async () => { expect(await result.current.importFile(new File(['x'], 'a.spell'))).toBe('new-id'); });
    importSpellFromFileMock.mockRejectedValueOnce(new Error('bad file'));
    await act(async () => { expect(await result.current.importFile(new File(['x'], 'b.spell'))).toBeNull(); });
  });

  describe('a protected file', () => {
    const locked = (wrong: boolean, password = true) => new SpellLockedError(wrong, password, password ? [] : ['key-elsewhere']);

    it('is opened with the caster\'s access keys first, asking nothing', async () => {
      importSpellFromFileMock.mockResolvedValue('new-id');
      const { result } = renderImport(makeStore('user-1'));
      await act(async () => { await result.current.importFile(new File(['x'], 'Locked.spell')); });
      const [, , unlock] = importSpellFromFileMock.mock.calls[0];
      expect(unlock.keys).toEqual([KEY]);
      expect(result.current.unlockPrompt).toBeNull();
    });

    it('asks for its password until it is the right one', async () => {
      importSpellFromFileMock
        .mockRejectedValueOnce(locked(false))
        .mockRejectedValueOnce(locked(true))
        .mockResolvedValueOnce('new-id');
      const store = makeStore('user-1');
      const { result } = renderImport(store);
      let done!: Promise<string | null | undefined>;
      act(() => { done = result.current.importFile(new File(['x'], 'Locked.spell')); });
      await vi.waitFor(() => expect(result.current.unlockPrompt).toMatchObject({ fileName: 'Locked', wrong: false }));
      act(() => result.current.unlockPrompt!.submit('wrong'));
      await vi.waitFor(() => expect(result.current.unlockPrompt).toMatchObject({ wrong: true, busy: false }));
      act(() => result.current.unlockPrompt!.submit('right'));
      expect(await act(() => done)).toBe('new-id');
      expect(importSpellFromFileMock.mock.calls.map(call => call[2].password)).toEqual([undefined, 'wrong', 'right']);
      expect(result.current.unlockPrompt).toBeNull();
      expect(store.getState().apiResponses.responses[0].type).toBe('success');
    });

    it('giving up on its password imports nothing, with no error', async () => {
      importSpellFromFileMock.mockRejectedValue(locked(false));
      const store = makeStore('user-1');
      const { result } = renderImport(store);
      let done!: Promise<string | null | undefined>;
      act(() => { done = result.current.importFile(new File(['x'], 'Locked.spell')); });
      await vi.waitFor(() => expect(result.current.unlockPrompt).not.toBeNull());
      act(() => result.current.unlockPrompt!.cancel());
      expect(await act(() => done)).toBeUndefined();
      expect(result.current.unlockPrompt).toBeNull();
      expect(store.getState().apiResponses.responses).toHaveLength(0);
      expect(store.getState().spellReader.listVersion).toBe(0);
    });

    it('gone while its password is asked for, it is given up on', async () => {
      importSpellFromFileMock.mockRejectedValue(locked(false));
      const store = makeStore('user-1');
      const { result, unmount } = renderImport(store);
      let done!: Promise<string | null | undefined>;
      act(() => { done = result.current.importFile(new File(['x'], 'Locked.spell')); });
      await vi.waitFor(() => expect(result.current.unlockPrompt).not.toBeNull());
      unmount();
      expect(await done).toBeUndefined();
      expect(importSpellFromFileMock).toHaveBeenCalledTimes(1);
      expect(store.getState().apiResponses.responses).toHaveLength(0);
    });

    it('protected only with a key not on this device: says so, asking nothing', async () => {
      importSpellFromFileMock.mockRejectedValue(locked(false, false));
      const store = makeStore('user-1');
      const { result } = renderImport(store);
      await act(async () => { expect(await result.current.importFile(new File(['x'], 'Locked.spell'))).toBeNull(); });
      expect(result.current.unlockPrompt).toBeNull();
      const [response] = store.getState().apiResponses.responses;
      expect(response.type).toBe('error');
      expect(response.message).toContain('Locked');
    });
  });
});
