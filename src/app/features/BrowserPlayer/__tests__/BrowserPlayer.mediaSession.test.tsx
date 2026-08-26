import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
}));

// Same speechSynthesis mock shape as BrowserPlayer.eventQueue.test.tsx, trimmed to
// what this file needs: synchronous speak()/cancel(), no artificial pause/resume
// latency (irrelevant here -- this suite is about mediaSession wiring, not the
// pause/resume queue).
let mockSpeaking = false;
let activeUtterance: { onend: (() => void) | null } | null = null;

const mockSpeechSynthesis = {
  get speaking() { return mockSpeaking; },
  paused: false,
  speak: vi.fn((u: { onend: (() => void) | null }) => { activeUtterance = u; mockSpeaking = true; }),
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn(() => { mockSpeaking = false; }),
  getVoices: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

beforeEach(() => {
  mockSpeaking = false;
  activeUtterance = null;
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
  vi.unstubAllGlobals();
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
};

describe('BrowserPlayer media session wiring', () => {
  it('re-registers the play/pause action handlers every time a new utterance starts speaking, not just at mount', async () => {
    const setActionHandlerSpy = vi.spyOn(navigator.mediaSession, 'setActionHandler');

    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled(); // first sentence started via autoPlayOnLoad
    const speakCallsAfterMount = mockSpeechSynthesis.speak.mock.calls.length;

    // The mount effect registers the handlers once.
    expect(setActionHandlerSpy).toHaveBeenCalledWith('play', expect.any(Function));
    expect(setActionHandlerSpy).toHaveBeenCalledWith('pause', expect.any(Function));
    setActionHandlerSpy.mockClear();

    // Simulate what a real browser can do to a page's registered media-session
    // action handlers around a speechSynthesis cancel()+speak() cycle (observed:
    // the OS media widget starts controlling window.speechSynthesis directly --
    // pressing the headset pause button no longer reaches our HEADSET_PAUSE
    // handler at all, so Redux's isPlaying never flips and anything else driven
    // by it, like SoundBackground's ambient audio, keeps playing). A page turn
    // mid-read (CONTENT_CHANGED while isPlaying) triggers exactly that cycle.
    (navigator.mediaSession as unknown as { setActionHandler: (a: string, h: unknown) => void })
      .setActionHandler('pause', null);

    await act(async () => {
      fireEvent.click(screen.getByTestId('playback-next-btn'));
      await Promise.resolve(); await Promise.resolve();
    });

    // A fresh utterance was spoken for the new page's content ...
    expect(mockSpeechSynthesis.speak.mock.calls.length).toBeGreaterThan(speakCallsAfterMount);
    // ... and the handlers must have been reasserted at that same moment, not
    // left cleared until the component eventually unmounts.
    expect(setActionHandlerSpy).toHaveBeenCalledWith('play', expect.any(Function));
    expect(setActionHandlerSpy).toHaveBeenCalledWith('pause', expect.any(Function));
  });

  it('routes a headset pause through Redux (dispatch(pause())) after a page change, not just the raw engine', async () => {
    const { store } = renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(store.getState().browserPlayer.isPlaying).toBe(true);

    // Simulate the real-world browser behavior a page turn can trigger around a
    // speechSynthesis cancel()+speak() cycle: the OS's registered 'pause' handler
    // gets silently cleared, as if the engine fell back to controlling
    // window.speechSynthesis directly instead of routing through our handler.
    (navigator.mediaSession as unknown as { setActionHandler: (a: string, h: unknown) => void })
      .setActionHandler('pause', null);

    await act(async () => {
      fireEvent.click(screen.getByTestId('playback-next-btn'));
      await Promise.resolve(); await Promise.resolve();
    });
    expect(store.getState().browserPlayer.isPlaying).toBe(true); // still playing the new page

    // The fix must have reasserted a real 'pause' handler as part of speaking the
    // new page's content -- pressing the headset pause button afterwards must
    // still reach Redux (and, via it, anything else keyed off isPlaying, like
    // SoundBackground's ambient audio), not silently do nothing because the OS
    // fell back to pausing only the raw speech engine.
    const handler = (navigator.mediaSession as unknown as { getActionHandler: (a: string) => (() => void) | null })
      .getActionHandler('pause');
    expect(handler).not.toBeNull();

    await act(async () => {
      handler!();
      await Promise.resolve(); await Promise.resolve();
    });
    expect(store.getState().browserPlayer.isPlaying).toBe(false);
  });

  it('does NOT re-register the action handlers on an ordinary same-page sentence-to-sentence advance', async () => {
    // Regression: an earlier version of this fix reasserted the handlers on
    // every engineSpeakSentence call unconditionally -- which happens on
    // EVERY sentence, not just page turns (CONTENT_CHANGED fires on every
    // currentSentenceIndex change too). Calling setActionHandler with a
    // brand-new closure every few seconds during ordinary reading made real
    // Chrome stop recognizing the page's own media session altogether and
    // fall back to its generic built-in Web Speech widget (observed: the OS
    // showing the raw voice name, e.g. "Google Deutsch", instead of the
    // spell's title) -- i.e. reintroduced the exact bug this fix exists to
    // solve. Reassertion must be gated to real (spell, page) changes only.
    const twoSentenceState = {
      ...baseState,
      spellReader: { ...baseState.spellReader, sentences: ['Sentence one.', 'Sentence two.'] },
    };
    const setActionHandlerSpy = vi.spyOn(navigator.mediaSession, 'setActionHandler');

    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: twoSentenceState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled(); // sentence one started
    const speakCallsBeforeAdvance = mockSpeechSynthesis.speak.mock.calls.length;
    setActionHandlerSpy.mockClear();

    // Sentence one ends -- the engine advances to sentence two, STILL on
    // page 1. This must not touch the OS action handlers at all.
    await act(async () => {
      activeUtterance!.onend!();
      await Promise.resolve(); await Promise.resolve();
    });
    expect(mockSpeechSynthesis.speak.mock.calls.length).toBeGreaterThan(speakCallsBeforeAdvance); // sentence two started
    expect(setActionHandlerSpy).not.toHaveBeenCalled();
  });
});
