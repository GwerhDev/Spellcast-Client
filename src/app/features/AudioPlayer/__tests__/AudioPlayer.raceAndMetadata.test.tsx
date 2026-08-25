import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { AudioPlayer } from '../index';
import { goToNextPage, setPageText, setSentences } from '../../../../store/spellReaderSlice';

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

// Deferred promise -- lets a test control exactly when an in-flight
// textToSpeechService call resolves, to simulate a real network/synthesis
// gap without a timer.
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

class MediaMetadataMock {
  title: string;
  artist: string;
  album: string;
  artwork: unknown[];
  constructor(init: { title?: string; artist?: string; album?: string; artwork?: unknown[] }) {
    this.title = init.title ?? '';
    this.artist = init.artist ?? '';
    this.album = init.album ?? '';
    this.artwork = init.artwork ?? [];
  }
}

let mediaSessionMock: { metadata: MediaMetadataMock | null; playbackState: string; setActionHandler: ReturnType<typeof vi.fn>; setPositionState: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
  getCachedAudioMock.mockResolvedValue(null);
  setCachedAudioMock.mockResolvedValue(undefined);
  vi.stubGlobal('MediaMetadata', MediaMetadataMock);
  mediaSessionMock = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: vi.fn(),
    setPositionState: vi.fn(),
  };
  Object.defineProperty(navigator, 'mediaSession', { value: mediaSessionMock, writable: true, configurable: true });
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
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
    totalPages: 5,
    currentPage: 3,
    isLoaded: true,
    hasInitialPageSet: true,
    showSearcher: false,
    currentPageText: 'Text for page three.',
    currentSentenceIndex: 0,
    sentences: ['Text for page three.'],
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

describe('AudioPlayer pause-during-fetch race (TCORE-81)', () => {
  it('does not resume playback once synthesis resolves if the user paused while it was in flight', async () => {
    const deferred = createDeferred<{ blob: Blob; timeline: never[] }>();
    textToSpeechServiceMock.mockReturnValue(deferred.promise);

    const { store } = renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('audio-player');

    // autoPlayOnLoad drives the real "start reading a fresh page" path: the
    // content-change effect computes wantsToPlayRef.current = true and
    // calls fetchAndPlay, which is now sitting on our deferred synthesis call.
    await waitFor(() => expect(textToSpeechServiceMock).toHaveBeenCalledTimes(1));

    // User pauses WHILE synthesis is still in flight. isPlaying in Redux is
    // already false at this point (fetchAndPlay itself never set it true
    // yet), so the click must register as a real pause via intent tracking,
    // not get silently swallowed.
    const button = screen.getByTestId('play-button');
    await act(async () => { fireEvent.click(button); });

    // Synthesis finally resolves.
    await act(async () => {
      deferred.resolve({ blob: new Blob(['fake-audio'], { type: 'audio/mpeg' }), timeline: [] });
      await Promise.resolve();
      await Promise.resolve();
    });

    // The bug: fetchAndPlay used to resume playback here regardless, because
    // it decided based on a stale snapshot taken before the pause occurred.
    expect(store.getState().audioPlayer.isPlaying).toBe(false);
    expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
});

describe('AudioPlayer Media Session metadata gating (TCORE-81)', () => {
  it('keeps reporting the previous page until the new page\'s audio has actually loaded', async () => {
    const firstPage = createDeferred<{ blob: Blob; timeline: never[] }>();
    textToSpeechServiceMock.mockReturnValueOnce(firstPage.promise);

    const { store } = renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('audio-player');
    await waitFor(() => expect(textToSpeechServiceMock).toHaveBeenCalledTimes(1));

    // Page 3's audio finishes loading.
    await act(async () => {
      firstPage.resolve({ blob: new Blob(['page-3-audio']), timeline: [] });
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(mediaSessionMock.metadata?.artist).toContain('3'));

    // User navigates to page 4 -- currentPage flips immediately (as it does
    // in the real app), and SpellProcessor's job of loading that page's text
    // is simulated here by dispatching setPageText/setSentences directly.
    const secondPage = createDeferred<{ blob: Blob; timeline: never[] }>();
    textToSpeechServiceMock.mockReturnValueOnce(secondPage.promise);
    await act(async () => {
      store.dispatch(goToNextPage());
      store.dispatch(setPageText({ text: 'Text for page four.' }));
      store.dispatch(setSentences({ sentences: ['Text for page four.'] }));
    });
    await waitFor(() => expect(textToSpeechServiceMock).toHaveBeenCalledTimes(2));

    // Page 4's audio hasn't loaded yet -- the OS media notification must
    // still show page 3, the last page that's actually audible, not the
    // page the reader has merely scrolled/navigated to.
    expect(mediaSessionMock.metadata?.artist).toContain('3');

    await act(async () => {
      secondPage.resolve({ blob: new Blob(['page-4-audio']), timeline: [] });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(mediaSessionMock.metadata?.artist).toContain('4'));
  });
});
