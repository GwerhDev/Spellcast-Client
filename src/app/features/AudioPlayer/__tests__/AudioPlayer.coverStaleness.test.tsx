import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { AudioPlayer } from '../index';
import { setSpellFile } from '../../../../store/spellReaderSlice';

// Deferred, per-spellId resolvers so a test can control exactly when each
// spell's cover fetch resolves -- the bug this file exists to catch only shows
// up while the SECOND spell's fetch is still in flight. Mirrors
// BrowserPlayer.coverStaleness.test.tsx, which caught the identical bug there.
const pending = new Map<string, { resolve: (doc: { cover: Blob } | null) => void }>();
const getSpellByIdMock = vi.fn((spellId: string) => new Promise((resolve) => {
  pending.set(spellId, { resolve });
})) as (spellId: string, userId: string) => Promise<{ cover: Blob } | null>;
vi.mock('../../../../db', () => ({
  getSpellById: (...args: [string, string]) => getSpellByIdMock(...args),
}));

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  pending.clear();
  vi.clearAllMocks();
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:mock-${n++}`);
  URL.revokeObjectURL = vi.fn();
});

afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

const baseState = {
  session: { logged: true, userData: { loader: false, id: 'user-1' } },
  audioPlayer: {
    playlist: [],
    currentTrackIndex: null,
    isPlaying: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    autoPlayOnLoad: false,
    timeline: [],
    pendingSeekMs: null,
    toggleSeq: 0,
  },
  spellReader: {
    spellId: 'spell-1',
    spellTitle: 'Spell One',
    totalPages: 1,
    currentPage: 1,
    isLoaded: true,
    hasInitialPageSet: true,
    showSearcher: false,
    currentPageText: 'Sentence one.',
    currentSentenceIndex: 0,
    sentences: ['Sentence one.'],
    showReaderSettings: false,
    fitToWidth: true,
    lightningMode: true,
    attentionGuardEnabled: false,
    attentionGuardInterval: 15,
    showAttentionGuard: false,
    activitySeq: 0,
    contentVersion: 0,
    listVersion: 0,
  },
  // 'browser' (not 'ai') keeps AudioPlayer's content-tracking effect from
  // calling fetchAndPlay/textToSpeechService at all -- irrelevant to this
  // suite, which is only about the cover-image effect.
  voice: {
    selectedVoice: { type: 'browser' as const, value: 'some-browser-voice' },
    voices: [],
  },
};

describe('AudioPlayer cover staleness across a spell switch', () => {
  it('does not keep showing the previous spell\'s cover while the new spell\'s cover is still loading', async () => {
    const { store } = renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    await act(async () => { await Promise.resolve(); });
    expect(getSpellByIdMock).toHaveBeenCalledWith('spell-1', 'user-1');

    // spell-1's cover resolves.
    await act(async () => {
      pending.get('spell-1')!.resolve({ cover: new Blob(['a']) });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });
    expect(screen.getByTestId('audio-player-cover')).toHaveAttribute('src', 'blob:mock-0');

    // Switch to spell-2 -- its own cover fetch is deliberately left pending.
    await act(async () => {
      store.dispatch(setSpellFile({ id: 'spell-2', title: 'Spell Two' }));
      await Promise.resolve();
    });
    expect(getSpellByIdMock).toHaveBeenCalledWith('spell-2', 'user-1');

    // Spell-2's title is already showing (Redux updated synchronously) --
    // the cover must not still be spell-1's stale blob URL in the meantime,
    // or the OS media session widget ends up showing spell-2's title next to
    // spell-1's artwork until spell-2's fetch happens to resolve.
    expect(screen.queryByTestId('audio-player-cover')).not.toBeInTheDocument();
    expect(screen.getByTestId('audio-player-cover-placeholder')).toBeInTheDocument();
    expect(screen.getByTestId('audio-player-title')).toHaveTextContent('Spell Two');

    // Once spell-2's own cover resolves, it shows correctly.
    await act(async () => {
      pending.get('spell-2')!.resolve({ cover: new Blob(['b']) });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });
    expect(screen.getByTestId('audio-player-cover')).toHaveAttribute('src', 'blob:mock-1');
  });
});
