import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import sessionReducer from '../../store/sessionSlice';
import apiResponsesReducer from '../../store/apiResponsesSlice';
import { LanguageProvider } from '../../i18n';

const exportSpellToBlobMock = vi.fn();
const downloadBlobMock = vi.fn();
vi.mock('../../utils/spellFormat', () => ({
  exportSpellToBlob: (...args: unknown[]) => exportSpellToBlobMock(...args),
  downloadBlob: (...args: unknown[]) => downloadBlobMock(...args),
}));

const { useSpellExport } = await import('../useSpellExport');

const makeStore = (userId: string | undefined) => {
  const store = configureStore({
    reducer: combineReducers({
      session: sessionReducer,
      apiResponses: apiResponsesReducer,
    }),
  });
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { loader: false, id: userId } } });
  return store;
};

const renderExport = (store: ReturnType<typeof makeStore>) =>
  renderHook(() => useSpellExport(), {
    wrapper: ({ children }) => (
      <Provider store={store}>
        <LanguageProvider>{children}</LanguageProvider>
      </Provider>
    ),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSpellExport', () => {
  it('has no export target until openExportModal is called', () => {
    const store = makeStore('user-1');
    const { result } = renderExport(store);
    expect(result.current.exportTarget).toBeNull();
  });

  it('openExportModal sets the target; closeExportModal clears it', () => {
    const store = makeStore('user-1');
    const { result } = renderExport(store);

    act(() => { result.current.openExportModal({ id: 'spell-1', title: 'My Spell' }); });
    expect(result.current.exportTarget).toEqual({ id: 'spell-1', title: 'My Spell' });

    act(() => { result.current.closeExportModal(); });
    expect(result.current.exportTarget).toBeNull();
  });

  it('handleExport reads/zips/downloads the target and closes the modal on success', async () => {
    exportSpellToBlobMock.mockResolvedValue({ blob: new Blob(['zip']), filename: 'My Spell.spell' });
    const store = makeStore('user-1');
    const { result } = renderExport(store);

    act(() => { result.current.openExportModal({ id: 'spell-1', title: 'My Spell' }); });
    await act(async () => { await result.current.handleExport({ includeSource: true }); });

    expect(exportSpellToBlobMock).toHaveBeenCalledWith('spell-1', 'user-1', { includeSource: true });
    expect(downloadBlobMock).toHaveBeenCalledWith(expect.any(Blob), 'My Spell.spell');
    expect(result.current.exportTarget).toBeNull();
    expect(result.current.isExporting).toBe(false);
  });

  it('reports an error and keeps the modal open when export fails', async () => {
    exportSpellToBlobMock.mockRejectedValue(new Error('disk full'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = makeStore('user-1');
    const { result } = renderExport(store);

    act(() => { result.current.openExportModal({ id: 'spell-1', title: 'My Spell' }); });
    await act(async () => { await result.current.handleExport({}); });

    expect(downloadBlobMock).not.toHaveBeenCalled();
    // The modal stays open on failure -- the user can retry without re-selecting the spell.
    expect(result.current.exportTarget).toEqual({ id: 'spell-1', title: 'My Spell' });
    const responses = store.getState().apiResponses.responses;
    expect(responses).toHaveLength(1);
    expect(responses[0].type).toBe('error');
    expect(result.current.isExporting).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it('does nothing when there is no export target set', async () => {
    const store = makeStore('user-1');
    const { result } = renderExport(store);

    await act(async () => { await result.current.handleExport({}); });
    expect(exportSpellToBlobMock).not.toHaveBeenCalled();
  });

  it('does nothing when there is no logged-in user id', async () => {
    const store = makeStore(undefined);
    const { result } = renderExport(store);

    act(() => { result.current.openExportModal({ id: 'spell-1', title: 'My Spell' }); });
    await act(async () => { await result.current.handleExport({}); });

    expect(exportSpellToBlobMock).not.toHaveBeenCalled();
  });

  it('closeExportModal is a no-op while an export is in flight', async () => {
    let resolveExport!: (v: { blob: Blob; filename: string }) => void;
    exportSpellToBlobMock.mockReturnValue(new Promise((resolve) => { resolveExport = resolve; }));
    const store = makeStore('user-1');
    const { result } = renderExport(store);

    act(() => { result.current.openExportModal({ id: 'spell-1', title: 'My Spell' }); });
    let exportPromise!: Promise<void>;
    act(() => { exportPromise = result.current.handleExport({}); });

    expect(result.current.isExporting).toBe(true);
    act(() => { result.current.closeExportModal(); });
    // Still open -- closing is ignored while isExporting is true.
    expect(result.current.exportTarget).toEqual({ id: 'spell-1', title: 'My Spell' });

    await act(async () => {
      resolveExport({ blob: new Blob(['zip']), filename: 'x.spell' });
      await exportPromise;
    });
    expect(result.current.exportTarget).toBeNull();
  });
});
