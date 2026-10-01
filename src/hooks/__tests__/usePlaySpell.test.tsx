import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { makeStore } from '../../test/renderWithProviders';
import { usePlaySpell } from '../usePlaySpell';
import { setSpellLoaded } from '../../store/spellReaderSlice';
import { play } from '../../store/browserPlayerSlice';
import { setSelectedVoice } from '../../store/voiceSlice';
import type { Spell } from '../../interfaces';

const spell = {
  id: 'spell-1',
  userId: 'user-1',
  title: 'Spell one',
  createdAt: new Date(),
  pagesContent: JSON.stringify(['a', 'b', 'c']),
} as Spell;

const setup = (store = makeStore(), path = '/') => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}><MemoryRouter initialEntries={[path]}>{children}</MemoryRouter></Provider>
  );
  return { store, ...renderHook(() => usePlaySpell(), { wrapper }) };
};

// The hook along with where the app is, to see where unloading leaves it.
const setupAt = (path: string) => {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}><MemoryRouter initialEntries={[path]}>{children}</MemoryRouter></Provider>
  );
  return { store, ...renderHook(() => ({ player: usePlaySpell(), location: useLocation() }), { wrapper }) };
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

  describe('readSpell (drop to read)', () => {
    const loaded = () => {
      const hook = setup();
      act(() => hook.result.current.readSpell(spell));
      act(() => { hook.store.dispatch(setSpellLoaded(true)); });
      hook.rerender();
      return hook;
    };

    it('loads a spell that is not the current one', () => {
      const { store, result } = setup();
      act(() => result.current.readSpell(spell));
      expect(store.getState().spellReader.spellId).toBe('spell-1');
      expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(true);
    });

    it('never pauses the loaded spell while it is playing', () => {
      const { store, result, rerender } = loaded();
      act(() => { store.dispatch(play()); });
      rerender();
      const { toggleSeq, resumeSeq } = store.getState().browserPlayer;
      act(() => result.current.readSpell(spell));
      expect(store.getState().browserPlayer.toggleSeq).toBe(toggleSeq);
      expect(store.getState().browserPlayer.resumeSeq).toBe(resumeSeq);
      expect(store.getState().audioPlayer.toggleSeq).toBe(0);
    });

    it('resumes (not toggles) the loaded spell when the browser player is paused', () => {
      const { store, result } = loaded();
      const { toggleSeq, resumeSeq } = store.getState().browserPlayer;
      act(() => result.current.readSpell(spell));
      expect(store.getState().browserPlayer.resumeSeq).toBe(resumeSeq + 1);
      expect(store.getState().browserPlayer.toggleSeq).toBe(toggleSeq);
    });

    it('resumes the paused provider voice player with its toggle', () => {
      const { store, result, rerender } = loaded();
      act(() => { store.dispatch(setSelectedVoice({ value: 'v', type: 'ai' })); });
      rerender();
      act(() => result.current.readSpell(spell));
      expect(store.getState().audioPlayer.toggleSeq).toBe(1);
    });
  });

  describe('mountSpell (load into the player)', () => {
    it('loads the spell paused: no autoplay on either player', () => {
      const { store, result } = setup();
      act(() => result.current.mountSpell(spell));
      const state = store.getState();
      expect(state.spellReader.spellId).toBe('spell-1');
      expect(state.browserPlayer.autoPlayOnLoad).toBe(false);
      expect(state.audioPlayer.autoPlayOnLoad).toBe(false);
    });

    it('leaves the spell alone when it is already the loaded one', () => {
      const { store, result, rerender } = setup();
      act(() => result.current.playSpell(spell));
      act(() => { store.dispatch(play()); });
      rerender();
      act(() => result.current.mountSpell(spell));
      expect(store.getState().browserPlayer.isPlaying).toBe(true);
      expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(true);
    });
  });

  it('unloadSpell leaves nothing loaded and both players reset', () => {
    const { store, result, rerender } = setup();
    act(() => result.current.playSpell(spell));
    act(() => { store.dispatch(setSpellLoaded(true)); store.dispatch(play()); });
    rerender();
    act(() => result.current.unloadSpell());
    const state = store.getState();
    expect(state.spellReader.spellId).toBeNull();
    expect(state.spellReader.isLoaded).toBe(false);
    expect(state.browserPlayer.isPlaying).toBe(false);
    expect(state.audioPlayer.isPlaying).toBe(false);
  });

  // The reader loads its own spell: unloading there would only load it right back.
  describe('unloading from the reader', () => {
    it('in that spell\'s reader, leaves to its detail page before unloading', () => {
      const { store, result } = setupAt('/spell/spell-1/reader');
      act(() => result.current.player.mountSpell(spell));
      act(() => result.current.player.unloadSpell());
      expect(result.current.location.pathname).toBe('/spell/spell-1');
      expect(store.getState().spellReader.spellId).toBeNull();
    });

    it('can leave somewhere else instead (e.g. home)', () => {
      const { result } = setupAt('/spell/spell-1/reader');
      act(() => result.current.player.mountSpell(spell));
      act(() => result.current.player.unloadSpell({ leaveReaderTo: '/' }));
      expect(result.current.location.pathname).toBe('/');
    });

    it('stays put anywhere else', () => {
      const { result } = setupAt('/grimoire');
      act(() => result.current.player.mountSpell(spell));
      act(() => result.current.player.unloadSpell());
      expect(result.current.location.pathname).toBe('/grimoire');
    });

    it('stays put in another spell\'s reader', () => {
      const { result } = setupAt('/spell/spell-2/reader');
      act(() => result.current.player.mountSpell(spell));
      act(() => result.current.player.unloadSpell());
      expect(result.current.location.pathname).toBe('/spell/spell-2/reader');
    });
  });
});
