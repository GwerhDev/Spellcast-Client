import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { AudioPlayer } from '../index';

// TCORE-117: setCachedAudio() used to be fired-and-forgotten (no await) inside AudioPlayer,
// so a QuotaExceededError on that write became an unhandled promise rejection -- caught
// nowhere, shown to no one. These tests exercise the real synthesis path (fetchAndPlay) with
// setCachedAudio rejecting, and assert playback still proceeds while a specific, actionable
// toast is shown instead.
//
// hasWarnedAboutAudioCacheQuota (module-level, by design -- the warning should survive page
// navigation within a session) is NOT reset between these two tests: the quota test runs
// first and sets it, and the non-quota test's own assertion (no toast for a non-quota
// failure) holds regardless of that flag's value, so the two don't interfere. Don't reorder
// this file's tests, and don't add a third test here that depends on the flag being unset --
// vi.resetModules() can't safely help since AudioPlayer, once re-imported fresh, would pull
// in a LanguageContext module instance whose identity no longer matches the one
// renderWithProviders' already-imported LanguageProvider wraps around it.
const getCachedAudioMock = vi.fn();
const setCachedAudioMock = vi.fn();
vi.mock('../../../../db/audioCache', () => ({
  getCachedAudio: (...args: unknown[]) => getCachedAudioMock(...args),
  setCachedAudio: (...args: unknown[]) => setCachedAudioMock(...args),
  AUDIO_CACHE_VERSION: 4,
}));

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn(() => Promise.resolve({ pagesContent: JSON.stringify([{ type: 'doc' }]) })),
}));

const textToSpeechServiceMock = vi.fn();
vi.mock('../../../../services/tts', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/tts')>('../../../../services/tts');
  return {
    ...actual,
    textToSpeechService: (...args: unknown[]) => textToSpeechServiceMock(...args),
  };
});

const baseState = {
  session: { logged: true, userData: { loader: false, id: 'user-1' } },
  audioPlayer: {
    playlist: [], currentTrackIndex: null, isPlaying: false, volume: 1, currentTime: 0,
    duration: 0, autoPlayOnLoad: true, timeline: [], pendingSeekMs: null, toggleSeq: 0,
  },
  spellReader: {
    spellId: 'spell-1', spellTitle: 'Test Spell', totalPages: 1, currentPage: 1, isLoaded: true,
    hasInitialPageSet: true, showSearcher: false, currentPageText: 'Sentence one.',
    currentSentenceIndex: 0, sentences: ['Sentence one.'], showReaderSettings: false,
    fitToWidth: true, lightningMode: true, attentionGuardEnabled: false,
    attentionGuardInterval: 15, showAttentionGuard: false, activitySeq: 0, contentVersion: 0,
    listVersion: 0,
  },
  voice: { selectedVoice: { type: 'ai' as const, value: 'some-ai-voice' }, voices: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  getCachedAudioMock.mockResolvedValue(null);
  textToSpeechServiceMock.mockResolvedValue({ blob: new Blob(['audio']), timeline: [{ start: 0, end: 100 }] });
});

describe('AudioPlayer audio-cache quota handling', () => {
  it('shows an actionable toast (not a raw error) and still loads the audio when caching hits the quota', async () => {
    setCachedAudioMock.mockRejectedValue(new DOMException('no space left', 'QuotaExceededError'));

    const { store } = renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('audio-player');
    await waitFor(() => expect(setCachedAudioMock).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    await waitFor(() => {
      const responses = store.getState().apiResponses.responses;
      expect(responses).toHaveLength(1);
    });
    const [toast] = store.getState().apiResponses.responses;
    expect(toast.type).toBe('error');
    expect(toast.message).not.toMatch(/QuotaExceededError|DOMException/);
    // Playback isn't blocked by the cache-write failure -- the audio element still gets
    // wired up with the blob that was already fetched successfully.
    expect(screen.getByTestId('audio-player').querySelector('audio')?.src).toMatch(/^blob:/);
  });

  it('does not show a toast for a non-quota cache-write failure (logs only, matching prior behavior)', async () => {
    setCachedAudioMock.mockRejectedValue(new Error('network hiccup'));

    const { store } = renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('audio-player');
    await waitFor(() => expect(setCachedAudioMock).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(store.getState().apiResponses.responses).toHaveLength(0);
  });
});
