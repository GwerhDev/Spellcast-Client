import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
}));

// Reproduces a DIFFERENT, more severe failure than the "onpause/onresume
// callback just doesn't fire" case already covered by
// BrowserPlayer.eventQueue.test.tsx's "recovers via the safety timeout" test.
// That suite's mock still flips .paused/.speaking correctly after a delay --
// it only withholds the JS callback. This models the real-world asymmetry
// most commonly reported (Chrome after a tab was backgrounded a while / the
// OS suspended the process): pause() keeps working normally, but resume() on
// that already-loaded utterance goes completely dead -- accepted without
// throwing, but it neither flips .paused back nor ever fires onresume.
// speak()/cancel() on a FRESH utterance, however, still work -- the real,
// documented recovery technique (cancel + a brand-new utterance), which is
// exactly what this mock needs to model to prove the fix's fallback
// genuinely reconnects, rather than just not-crashing.
let mockSpeaking = false;
let mockPaused = false;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let zombie = false;
const goZombie = () => { zombie = true; };

const mockSpeechSynthesis = {
  get speaking() { return mockSpeaking; },
  get paused() { return mockPaused; },
  speak: vi.fn((u: SpeechSynthesisUtterance) => {
    // A fresh speak() always works, zombie or not -- it's what un-sticks a
    // real wedged Chrome engine, so the mock must let it succeed for the
    // fix's fallback to be provably testable.
    activeUtterance = u;
    mockSpeaking = true;
    mockPaused = false;
  }),
  pause: vi.fn(() => {
    // pause() keeps working even once zombie -- see this mock's own header
    // comment for why that asymmetry is the realistic one to model.
    mockPaused = true;
    activeUtterance?.onpause?.(new Event('pause') as unknown as SpeechSynthesisEvent);
  }),
  resume: vi.fn(() => {
    if (zombie) return; // resume on the STALE utterance never works once zombie
    mockPaused = false;
    activeUtterance?.onresume?.(new Event('resume') as unknown as SpeechSynthesisEvent);
  }),
  cancel: vi.fn(() => {
    mockSpeaking = false;
    activeUtterance = null;
  }),
  getVoices: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

beforeEach(() => {
  vi.useFakeTimers();
  mockSpeaking = false;
  mockPaused = false;
  activeUtterance = null;
  zombie = false;
  vi.clearAllMocks();
  Object.defineProperty(window, 'speechSynthesis', { value: mockSpeechSynthesis, writable: true });
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string;
    onend: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    onpause: ((e: unknown) => void) | null = null;
    onresume: ((e: unknown) => void) | null = null;
    voice: unknown = null;
    volume = 1;
    constructor(text: string) { this.text = text; }
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const baseState = {
  browserPlayer: {
    isPlaying: false,
    voice: null,
    volume: 1,
    autoPlayOnLoad: true,
    toggleSeq: 0,
    resumeSeq: 0,
    externalPauseSeq: 0,
  },
  spellReader: {
    spellId: 'spell-1',
    spellTitle: 'Test Spell',
    totalPages: 1,
    currentPage: 1,
    isLoaded: true,
    hasInitialPageSet: true,
    showSearcher: false,
    currentPageText: 'Sentence one. Sentence two.',
    currentSentenceIndex: 0,
    sentences: ['Sentence one.', 'Sentence two.'],
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
};

describe('BrowserPlayer reconnect after a genuinely unresponsive ("zombie") engine', () => {
  it('falls back to a fresh speak() of the current sentence when resume never confirms, instead of getting stuck', async () => {
    const { store } = renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();

    // The tab gets backgrounded for a long time / the OS suspends the
    // process -- when it comes back, pause()/resume() on the utterance
    // already loaded in the engine never work again.
    goZombie();

    const button = screen.getByTestId('play-button');

    // User (or the attention guard's "Continue" button, same code path)
    // clicks pause, then play again -- exactly what happens when the
    // attention guard fires and the user dismisses it.
    await act(async () => {
      fireEvent.click(button); // pause
      await Promise.resolve(); await Promise.resolve();
    });
    expect(store.getState().browserPlayer.isPlaying).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(600); }); // pause's safety timeout

    const speakCallsBeforeResume = mockSpeechSynthesis.speak.mock.calls.length;

    await act(async () => {
      fireEvent.click(button); // play/resume
      await Promise.resolve(); await Promise.resolve();
    });
    // resume() is a zombie no-op -- nothing confirms it within the safety
    // window, so the fallback must kick in: cancel() the stale utterance and
    // speak() the CURRENT sentence fresh, rather than just assuming success.
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });

    expect(mockSpeechSynthesis.speak.mock.calls.length).toBe(speakCallsBeforeResume + 1);
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
    expect(mockSpeechSynthesis.speaking).toBe(true);

    // The fresh utterance is a genuinely new, non-zombie one (per this
    // mock's speak(), matching real Chrome's recovery behavior) -- proving
    // this isn't just a retry that also silently fails: playback actually
    // continues, onend fires normally, and the reader advances.
    activeUtterance?.onend?.(new Event('end') as unknown as SpeechSynthesisEvent);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(store.getState().spellReader.currentSentenceIndex).toBe(1);
  });

  it('recovers on its own when the tab becomes visible again after the engine died while backgrounded', async () => {
    const { store } = renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
    const speakCallsBeforeBackground = mockSpeechSynthesis.speak.mock.calls.length;

    // The tab gets backgrounded; the OS suspends the process; the engine
    // dies completely -- .speaking drops to false with no event, no user
    // interaction involved at all yet.
    goZombie();
    mockSpeaking = false;

    // The tab comes back to the foreground.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve(); await Promise.resolve();
    });

    // Recovered proactively -- no click needed. Redux never even had to
    // flip through a false "paused" state for the user to notice.
    expect(mockSpeechSynthesis.speak.mock.calls.length).toBe(speakCallsBeforeBackground + 1);
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
    expect(mockSpeechSynthesis.speaking).toBe(true);
  });
});
