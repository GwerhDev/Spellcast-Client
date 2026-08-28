import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { AudioPlayer } from '../index';

// A controllable, never-auto-resolving getSpellById -- lets the cover-fetch gate settle on
// demand without depending on its own internal timing.
let resolveGetSpellById: ((doc: unknown) => void) | null = null;
const getSpellByIdMock = vi.fn(() => new Promise((resolve) => { resolveGetSpellById = resolve; })) as
  (spellId: string, userId: string) => Promise<unknown>;
vi.mock('../../../../db', () => ({
  getSpellById: (...args: [string, string]) => getSpellByIdMock(...args),
}));

const getCachedAudioMock = vi.fn();
const setCachedAudioMock = vi.fn();
vi.mock('../../../../db/audioCache', () => ({
  getCachedAudio: (...args: unknown[]) => getCachedAudioMock(...args),
  setCachedAudio: (...args: unknown[]) => setCachedAudioMock(...args),
  AUDIO_CACHE_VERSION: 4,
}));

const textToSpeechServiceMock = vi.fn();
vi.mock('../../../../services/tts', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/tts')>('../../../../services/tts');
  return {
    ...actual,
    textToSpeechService: (...args: unknown[]) => textToSpeechServiceMock(...args),
  };
});

beforeEach(() => {
  resolveGetSpellById = null;
  vi.clearAllMocks();
  textToSpeechServiceMock.mockResolvedValue({ blob: new Blob(['audio']), timeline: [{ start: 0, end: 100 }] });
  setCachedAudioMock.mockResolvedValue(undefined);
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
    autoPlayOnLoad: true,
    timeline: [],
    pendingSeekMs: null,
    toggleSeq: 0,
  },
  spellReader: {
    spellId: 'spell-1',
    spellTitle: 'Test Spell',
    totalPages: 2,
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
  voice: {
    selectedVoice: { type: 'ai' as const, value: 'some-ai-voice' },
    voices: [],
  },
};

// TCORE regression: prefetchNextPage must treat a stale-cacheVersion record the same way
// fetchAndPlay does -- as a miss requiring a fresh fetch -- not as an already-warm cache
// hit. Otherwise a page synthesized under an old AUDIO_CACHE_VERSION silently blocks the
// prefetch, and the user still hits a cold, blocking fetch once they actually turn to
// that page, even though a prefetch supposedly already ran.
describe('AudioPlayer prefetchNextPage', () => {
  it('re-fetches the next page when its cached audio has a stale cacheVersion, instead of treating it as a hit', async () => {
    // Page 1's own cache lookup (inside fetchAndPlay) is a clean miss so it fetches
    // normally; page 2's lookup (inside prefetchNextPage) returns a record with an old
    // cacheVersion, which must NOT be treated as valid.
    getCachedAudioMock.mockImplementation((_spellId: string, page: number) => {
      if (page === 2) {
        return Promise.resolve({ blob: new Blob(['stale']), timeline: [{ start: 0, end: 50 }], cacheVersion: 3 });
      }
      return Promise.resolve(null);
    });

    renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('audio-player');
    await act(async () => {
      resolveGetSpellById!({ cover: new Blob(['a']) });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });

    // First call is page 1's own fetchAndPlay; the prefetch triggers a second
    // textToSpeechService call for page 2's doc once page 1's fetch settles.
    await waitFor(() => expect(textToSpeechServiceMock).toHaveBeenCalledTimes(1));

    // Prefetch reads the spell doc (to slice out page 2's content) via getSpellById,
    // resolved by the same controllable mock used for the cover fetch above.
    await act(async () => {
      resolveGetSpellById!({ pagesContent: JSON.stringify([{ type: 'doc' }, { type: 'doc' }]) });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });

    await waitFor(() => expect(textToSpeechServiceMock).toHaveBeenCalledTimes(2));
    // The prefetch must persist the freshly-synthesized page 2 audio, not skip the write
    // because it thought the stale record was already good enough.
    expect(setCachedAudioMock).toHaveBeenCalledWith('spell-1', 2, 'some-ai-voice', expect.any(Blob), expect.any(Array));
  });

  it('does NOT re-fetch the next page when its cached audio is already at the current cacheVersion', async () => {
    getCachedAudioMock.mockImplementation((_spellId: string, page: number) => {
      if (page === 2) {
        return Promise.resolve({ blob: new Blob(['fresh']), timeline: [{ start: 0, end: 50 }], cacheVersion: 4 });
      }
      return Promise.resolve(null);
    });

    renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('audio-player');
    await act(async () => {
      resolveGetSpellById!({ cover: new Blob(['a']) });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });

    // Only page 1's own fetch happens -- page 2 is genuinely already warm, so no second
    // textToSpeechService call should ever fire, and no further getSpellById call for the
    // page-2 doc slice is needed either.
    await waitFor(() => expect(textToSpeechServiceMock).toHaveBeenCalledTimes(1));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(textToSpeechServiceMock).toHaveBeenCalledTimes(1);
  });
});
