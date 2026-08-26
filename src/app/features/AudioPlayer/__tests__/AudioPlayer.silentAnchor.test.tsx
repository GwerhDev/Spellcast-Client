import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { AudioPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  getCachedAudioMock.mockResolvedValue(null);
  setCachedAudioMock.mockResolvedValue(undefined);
});

const baseState = {
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

describe('AudioPlayer silent anchor', () => {
  it('starts a real, always-audible silent anchor element the instant playback is intended, before the AI synthesis fetch resolves', async () => {
    // Chromium doesn't reliably adopt a page's navigator.mediaSession as the
    // OS-facing widget until some real HTMLMediaElement is genuinely
    // playing. AI audio synthesis has a real network round-trip before its
    // OWN <audio> element starts playing -- during that window, metadata was
    // already set correctly in JS, but nothing was actually audible yet, so
    // the OS widget didn't sync (observed: title/artist blank in the widget
    // until the next click/page-turn). The fix anchors real audio playback
    // from the moment play is INTENDED (autoPlayOnLoad here), independent of
    // whether the real synthesized audio is ready.
    const deferred = createDeferred<{ blob: Blob; timeline: never[] }>();
    textToSpeechServiceMock.mockReturnValue(deferred.promise);
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);

    renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('audio-player');
    await waitFor(() => expect(textToSpeechServiceMock).toHaveBeenCalledTimes(1));

    // The real synthesis fetch is STILL pending -- nothing about the actual
    // AI audio could possibly be playing yet.
    const anchor = screen.getByTestId('audio-player-silent-anchor') as HTMLAudioElement;
    expect(playSpy.mock.instances).toContain(anchor);

    await act(async () => {
      deferred.resolve({ blob: new Blob(['fake-audio'], { type: 'audio/mpeg' }), timeline: [] });
      await Promise.resolve();
      await Promise.resolve();
    });
  });
});
