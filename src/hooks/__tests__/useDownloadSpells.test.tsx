import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from '../../test/renderWithProviders';
import { LanguageProvider } from '../../i18n';
import { useDownloadSpells } from '../useDownloadSpells';

const exportSpellToBlobMock = vi.fn();
const downloadBlobMock = vi.fn();
vi.mock('../../utils/spellFormat', () => ({
  exportSpellToBlob: (...args: unknown[]) => exportSpellToBlobMock(...args),
  downloadBlob: (...args: unknown[]) => downloadBlobMock(...args),
}));

// A directory the caster picked, in memory: what's in it, by name.
const makeDirectory = (existing: string[] = []) => {
  const files = new Map<string, number>(existing.map(name => [name, 1]));
  const handle = {
    getFileHandle: vi.fn(async (name: string, options?: { create?: boolean }) => {
      if (!options?.create && !files.has(name)) throw new DOMException('not found', 'NotFoundError');
      return { createWritable: async () => ({ write: async (blob: Blob) => { files.set(name, blob.size); }, close: async () => {} }) };
    }),
  };
  return { files, handle };
};

const render = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  const hook = renderHook(() => useDownloadSpells(), {
    wrapper: ({ children }) => <Provider store={store}><LanguageProvider>{children}</LanguageProvider></Provider>,
  });
  return { ...hook, store };
};

const setPicker = (picker: unknown) => { (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker = picker; };

beforeEach(() => {
  exportSpellToBlobMock.mockReset().mockImplementation(async (id: string) => ({ blob: new Blob([id]), filename: id === 'c' ? 'Other.spell' : 'Same.spell' }));
  downloadBlobMock.mockReset();
});
afterEach(() => setPicker(undefined));

describe('useDownloadSpells', () => {
  it('one spell is an ordinary download', async () => {
    const picker = vi.fn();
    setPicker(picker);
    const { result } = render();
    await act(async () => { await result.current.download(['a'], { includeAudio: true }); });
    expect(picker).not.toHaveBeenCalled();
    expect(exportSpellToBlobMock).toHaveBeenCalledWith('a', 'user-1', { includeAudio: true });
    expect(downloadBlobMock).toHaveBeenCalledWith(expect.any(Blob), 'Same.spell');
  });

  it('several go into the picked directory, never overwriting what is there', async () => {
    const { files, handle } = makeDirectory(['Other.spell']);
    setPicker(vi.fn(async () => handle));
    const { result, store } = render();
    await act(async () => { await result.current.download(['a', 'b', 'c'], {}); });
    expect([...files.keys()].sort()).toEqual(['Other (2).spell', 'Other.spell', 'Same (2).spell', 'Same.spell']);
    expect(files.get('Other.spell')).toBe(1); // left as it was
    expect(downloadBlobMock).not.toHaveBeenCalled();
    expect(store.getState().apiResponses.responses.at(-1)).toMatchObject({ type: 'success' });
  });

  it('closing the directory picker downloads nothing', async () => {
    setPicker(vi.fn(async () => { throw new DOMException('aborted', 'AbortError'); }));
    const { result } = render();
    await act(async () => { await result.current.download(['a', 'b'], {}); });
    expect(exportSpellToBlobMock).not.toHaveBeenCalled();
    expect(downloadBlobMock).not.toHaveBeenCalled();
  });

  it('without a directory picker (Firefox, Safari), several are one download each', async () => {
    const { result } = render();
    await act(async () => { await result.current.download(['a', 'c'], {}); });
    expect(downloadBlobMock).toHaveBeenCalledTimes(2);
  });

  it('a spell that fails is reported; the rest still download', async () => {
    exportSpellToBlobMock.mockImplementation(async (id: string) => { if (id === 'b') throw new Error('nope'); return { blob: new Blob([id]), filename: `${id}.spell` }; });
    const { result, store } = render();
    await act(async () => { await result.current.download(['a', 'b', 'c'], {}); });
    expect(downloadBlobMock).toHaveBeenCalledTimes(2);
    expect(store.getState().apiResponses.responses.at(-1)).toMatchObject({ type: 'error' });
  });
});
