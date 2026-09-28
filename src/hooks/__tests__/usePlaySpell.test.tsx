import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { makeStore } from '../../test/renderWithProviders';
import { usePlaySpell } from '../usePlaySpell';
import { setSpellLoaded } from '../../store/spellReaderSlice';
import type { Spell } from '../../interfaces';

const spell = {
  id: 'spell-1',
  userId: 'user-1',
  title: 'Spell one',
  createdAt: new Date(),
  pagesContent: JSON.stringify(['a', 'b', 'c']),
} as Spell;

const setup = (store = makeStore()) => {
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, ...renderHook(() => usePlaySpell(), { wrapper }) };
};

describe('usePlaySpell', () => {
  it('loads the spell into the reader with autoplay on both players', () => {
    const { store, result } = setup();
    act(() => result.current.playSpell(spell));
    const state = store.getState();
    expect(state.spellReader.spellId).toBe('spell-1');
    expect(state.spellReader.spellTitle).toBe('Spell one');
    expect(state.spellReader.totalPages).toBe(3);
    expect(state.browserPlayer.autoPlayOnLoad).toBe(true);
    expect(state.audioPlayer.autoPlayOnLoad).toBe(true);
  });

  it('toggles instead of reloading when that spell is already the one loaded', () => {
    const { store, result, rerender } = setup();
    act(() => result.current.playSpell(spell));
    act(() => { store.dispatch(setSpellLoaded(true)); });
    rerender();
    const before = store.getState().browserPlayer.toggleSeq;
    act(() => result.current.playSpell(spell));
    expect(store.getState().browserPlayer.toggleSeq).toBe(before + 1);
    expect(store.getState().spellReader.spellId).toBe('spell-1');
  });
});
