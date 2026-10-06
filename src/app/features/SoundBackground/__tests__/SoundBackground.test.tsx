import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SoundBackground } from '../index';
import { setActiveSoundBg } from '../../../../store/casterInventorySlice';
import { setSpellFile } from '../../../../store/spellReaderSlice';
import { play } from '../../../../store/browserPlayerSlice';
import type { SpellCosmetics } from '../../../../db/spellCosmetics';

// The spell's own picks, read when the test says so.
let readPicks: (picks: SpellCosmetics) => void = () => {};
let failRead: () => void = () => {};
vi.mock('../../../../db/spellCosmetics', () => ({
  getSpellCosmetics: vi.fn(() => new Promise<SpellCosmetics>((resolve, reject) => { readPicks = resolve; failRead = () => reject(new Error('unreadable')); })),
  setSpellCosmetic: vi.fn(async () => ({})),
}));

// Every sound started: its stream and whether it was played.
let sounds: { src: string; played: boolean }[] = [];
beforeEach(() => {
  sounds = [];
  vi.stubGlobal('Audio', class {
    loop = false;
    volume = 1;
    entry: { src: string; played: boolean };
    constructor(src: string) { this.entry = { src, played: false }; sounds.push(this.entry); }
    play() { this.entry.played = true; return Promise.resolve(); }
    pause() { this.entry.played = false; }
  });
});

// A caster whose default sound is the rain, with a spell loaded.
const withSpell = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  store.dispatch(setActiveSoundBg('rain-window'));
  store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
  return store;
};

describe('SoundBackground', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<SoundBackground />);
    expect(container).toBeInTheDocument();
  });

  // Starting the default for a moment loaded (and could play) a sound the spell doesn't use.
  it('starts nothing until the spell\'s picks are read, then its own sound', async () => {
    const store = withSpell();
    renderWithProviders(<SoundBackground />, { store });
    expect(sounds).toHaveLength(0);
    await act(async () => { readPicks({ soundBackground: 'cafe-murmur' }); });
    await waitFor(() => expect(sounds).toHaveLength(1));
    expect(sounds[0].src).toMatch(/cafe/i);
  });

  it('a spell that never picked plays the default once its picks are read', async () => {
    const store = withSpell();
    renderWithProviders(<SoundBackground />, { store });
    await act(async () => { readPicks({}); });
    await waitFor(() => expect(sounds).toHaveLength(1));
    expect(sounds[0].src).toMatch(/rain/i);
  });

  // The spell already playing when its sound is known: the sound joins in.
  it('plays a sound that arrives while the spell is already playing', async () => {
    const store = withSpell();
    renderWithProviders(<SoundBackground />, { store });
    act(() => { store.dispatch(play()); });
    await act(async () => { readPicks({}); });
    await waitFor(() => expect(sounds[0]?.played).toBe(true));
  });

  it('with the picks unreadable, the spell follows the default', async () => {
    const store = withSpell();
    renderWithProviders(<SoundBackground />, { store });
    await act(async () => { failRead(); });
    await waitFor(() => expect(sounds).toHaveLength(1));
    expect(sounds[0].src).toMatch(/rain/i);
  });
});
