import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { AudioPlayer } from '../index';

// A controllable, never-auto-resolving getSpellById -- lets a test hold the
// cover fetch open indefinitely to prove the DEDICATED metadata effect
// (independent of when playback starts) never writes anything until it
// settles.
let resolveGetSpellById: ((doc: { cover: Blob } | null) => void) | null = null;
const getSpellByIdMock = vi.fn(() => new Promise((resolve) => { resolveGetSpellById = resolve; })) as
  (spellId: string, userId: string) => Promise<{ cover: Blob } | null>;
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
  getCachedAudioMock.mockResolvedValue(null);
  setCachedAudioMock.mockResolvedValue(undefined);
  navigator.mediaSession.metadata = null;
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
    // Mounted WITHOUT autoplay -- this suite is specifically about the
    // dedicated metadata effect, which fires on state changes regardless of
    // whether anything is playing, unlike the play-trigger gate covered by
    // AudioPlayer.coverGate.test.tsx.
    autoPlayOnLoad: false,
    timeline: [],
    pendingSeekMs: null,
    toggleSeq: 0,
  },
  spellReader: {
    spellId: 'spell-1',
    spellTitle: 'Test Spell',
    totalPages: 3,
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
    selectedVoice: { type: 'browser' as const, value: 'some-browser-voice' },
    voices: [],
  },
};

describe('AudioPlayer never writes Media Session metadata before the cover fetch settles', () => {
  it('leaves navigator.mediaSession.metadata untouched while the cover fetch is pending, even with no playback involved', async () => {
    renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('audio-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    expect(getSpellByIdMock).toHaveBeenCalled();
    expect(navigator.mediaSession.metadata).toBeNull();

    await act(async () => {
      resolveGetSpellById!({ cover: new Blob(['a']) });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });

    expect(navigator.mediaSession.metadata).not.toBeNull();
    expect(navigator.mediaSession.metadata!.title).toBe('Test Spell');
    expect(navigator.mediaSession.metadata!.artwork.length).toBeGreaterThan(0);
  });
});
