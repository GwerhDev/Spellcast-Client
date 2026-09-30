import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { makeStore } from '../../test/renderWithProviders';
import { setSpellFile } from '../../store/spellReaderSlice';
import { play } from '../../store/browserPlayerSlice';
import { useDeleteSpells } from '../useDeleteSpells';
import * as db from '../../db';

const setup = (loadedId?: string) => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  if (loadedId) {
    store.dispatch(setSpellFile({ id: loadedId, title: 'Loaded', userId: 'user-1' }));
    store.dispatch(play());
  }
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useDeleteSpells(), { wrapper });
  return { store, deleteSpells: result.current };
};

describe('useDeleteSpells', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('deletes the spells and refreshes every list', async () => {
    const del = vi.spyOn(db, 'deleteSpellFromDB').mockResolvedValue(undefined);
    const { store, deleteSpells } = setup();
    const before = store.getState().spellReader.listVersion;
    await act(async () => { await deleteSpells(['a', 'b']); });
    expect(del).toHaveBeenCalledWith('a', 'user-1');
    expect(del).toHaveBeenCalledWith('b', 'user-1');
    expect(store.getState().spellReader.listVersion).toBe(before + 1);
  });

  it('unloads the loaded spell when it is one of the deleted', async () => {
    vi.spyOn(db, 'deleteSpellFromDB').mockResolvedValue(undefined);
    const { store, deleteSpells } = setup('a');
    await act(async () => { await deleteSpells(['a']); });
    expect(store.getState().spellReader.spellId).toBeNull();
    expect(store.getState().browserPlayer.isPlaying).toBe(false);
  });

  it('keeps the loaded spell when another one is deleted', async () => {
    vi.spyOn(db, 'deleteSpellFromDB').mockResolvedValue(undefined);
    const { store, deleteSpells } = setup('a');
    await act(async () => { await deleteSpells(['b']); });
    expect(store.getState().spellReader.spellId).toBe('a');
  });

  it('still unloads a deleted loaded spell when another delete fails, then rejects', async () => {
    vi.spyOn(db, 'deleteSpellFromDB').mockImplementation(async (id) => { if (id === 'b') throw new Error('boom'); });
    const { store, deleteSpells } = setup('a');
    await act(async () => { await expect(deleteSpells(['a', 'b'])).rejects.toThrow('boom'); });
    expect(store.getState().spellReader.spellId).toBeNull();
  });
});
