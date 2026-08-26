import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { AudioPlayer } from '../index';

// A controllable, never-auto-resolving getSpellById -- lets a test hold the
// cover fetch open indefinitely to prove playback genuinely waits for it.
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
  voice: {
    selectedVoice: { type: 'ai' as const, value: 'some-ai-voice' },
    voices: [],
  },
};

describe('AudioPlayer waits for the cover fetch before the first autoplay-triggered fetchAndPlay', () => {
  it('does not call textToSpeechService until the cover fetch settles, so the first Media Session write is already complete', async () => {
    renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('audio-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    // The cover fetch is still deliberately unresolved -- nothing must have
    // started synthesizing/fetching audio yet, or the Media Session metadata
    // for this spell will have already been announced once with empty
    // artwork.
    expect(getSpellByIdMock).toHaveBeenCalled();
    expect(textToSpeechServiceMock).not.toHaveBeenCalled();

    // Cover fetch settles.
    await act(async () => {
      resolveGetSpellById!({ cover: new Blob(['a']) });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });

    await waitFor(() => expect(textToSpeechServiceMock).toHaveBeenCalled());
  });
});
