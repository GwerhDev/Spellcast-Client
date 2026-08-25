import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
}));

// A speechSynthesis mock with real mutable state and CONTROLLABLE async
// latency for pause()/resume() -- modeling the real Chrome/Edge quirk that
// these calls don't synchronously flip .paused/.speaking. onpause/onresume
// on the active utterance are fired for real, after PAUSE_APPLY_DELAY_MS /
// RESUME_APPLY_DELAY_MS, so the queue's awaited primitives have something
// real to wait on. Both delays are kept well UNDER the engine's
// ENGINE_EVENT_SAFETY_TIMEOUT_MS (500ms in BrowserPlayer) -- that timeout
// exists only to survive a browser that never fires onpause/onresume at
// all, not to model realistic latency, so a delay longer than it would
// make this mock stop testing "the event eventually fires" and start
// testing "the safety timeout papers over a missing event" instead. See
// the FIRES_EVENT=false mock below for that second, deliberately distinct
// case.
const PAUSE_APPLY_DELAY_MS = 150;
const RESUME_APPLY_DELAY_MS = 100;
let mockSpeaking = false;
let mockPaused = false;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let firesPauseResumeEvents = true;

const mockSpeechSynthesis = {
  get speaking() { return mockSpeaking; },
  get paused() { return mockPaused; },
  // Real Chrome/Edge: calling speak() while the engine is sitting paused
  // loads the new utterance but does NOT itself start audio -- an explicit
  // resume() is required to actually leave the paused state. A mock that
  // reset mockPaused to false on every speak() would hide exactly the bug
  // this suite exists to catch (a plain CLICK_PLAY calling speak() on a
  // fresh utterance instead of resuming the still-loaded one).
  speak: vi.fn((u: SpeechSynthesisUtterance) => {
    activeUtterance = u;
    mockSpeaking = true;
    if (!mockPaused) mockPaused = false;
  }),
  pause: vi.fn(() => {
    setTimeout(() => {
      mockPaused = true;
      if (firesPauseResumeEvents) activeUtterance?.onpause?.(new Event('pause') as unknown as SpeechSynthesisEvent);
    }, PAUSE_APPLY_DELAY_MS);
  }),
  resume: vi.fn(() => {
    setTimeout(() => {
      mockPaused = false;
      if (firesPauseResumeEvents) activeUtterance?.onresume?.(new Event('resume') as unknown as SpeechSynthesisEvent);
    }, RESUME_APPLY_DELAY_MS);
  }),
  // Per the Web Speech API spec, cancel() does NOT change .paused -- only
  // pause()/resume() do. Some browsers don't even update .paused reliably
  // for pause() itself. A mock that reset mockPaused here would hide the
  // exact bug this suite exists to catch: cancel()+speak() on a fresh
  // utterance, called instead of resume(), leaving the engine's real paused
  // state stuck true forever with nothing to un-pause it.
  cancel: vi.fn(() => { mockSpeaking = false; activeUtterance = null; }),
  getVoices: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

beforeEach(() => {
  vi.useFakeTimers();
  mockSpeaking = false;
  mockPaused = false;
  activeUtterance = null;
  firesPauseResumeEvents = true;
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

describe('BrowserPlayer single event queue (TCORE-81)', () => {
  it('never bounces isPlaying back to true while a requested pause is still being applied by the engine', async () => {
    const { store } = renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();

    // User clicks pause. The queue's handler awaits the ENGINE'S OWN onpause
    // event -- there is no fixed timer here pretending to know how long that
    // takes.
    const pauseButton = screen.getByTestId('play-button');
    await act(async () => {
      fireEvent.click(pauseButton);
      await Promise.resolve(); await Promise.resolve();
    });

    // isPlaying flips to false as soon as the queue starts handling the
    // click (dispatch(pause()) happens before the await on the engine
    // inside the queue's handler) -- well before the engine has actually
    // caught up.
    expect(store.getState().browserPlayer.isPlaying).toBe(false);

    // Advance while the mock engine is STILL applying the pause (well under
    // PAUSE_APPLY_DELAY_MS) -- under the old poll-based design a fixed
    // confirmation-tick count alone could revert the pause here. Under the
    // queue, no other event can even be looked at until this handler's
    // await resolves, so there is nothing that COULD write isPlaying back
    // to true here.
    await act(async () => { await vi.advanceTimersByTimeAsync(PAUSE_APPLY_DELAY_MS / 2); });
    expect(store.getState().browserPlayer.isPlaying).toBe(false);
    expect(mockSpeechSynthesis.paused).toBe(false); // engine still catching up

    // Let the engine's real onpause fire.
    await act(async () => { await vi.advanceTimersByTimeAsync(PAUSE_APPLY_DELAY_MS); });
    expect(mockSpeechSynthesis.paused).toBe(true);
    expect(store.getState().browserPlayer.isPlaying).toBe(false);

    // Nothing left pending should flip it back either.
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(store.getState().browserPlayer.isPlaying).toBe(false);
  });

  it('serializes a rapid pause-then-play click pair instead of racing them', async () => {
    const { store } = renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(store.getState().browserPlayer.isPlaying).toBe(true);

    const toggleButton = screen.getByTestId('play-button');
    // Two rapid clicks: pause, then play, fired before the first click's
    // engine-side pause has actually landed (still mid-flight).
    await act(async () => {
      fireEvent.click(toggleButton); // enqueues CLICK_PAUSE (via TOGGLE_REQUESTED)
      await Promise.resolve(); await Promise.resolve();
    });
    expect(store.getState().browserPlayer.isPlaying).toBe(false);

    await act(async () => {
      fireEvent.click(toggleButton); // enqueues CLICK_PLAY (via TOGGLE_REQUESTED) -- must wait behind the pause's await
    });

    // Let every queued handler and its awaits fully settle: the queued PLAY
    // sits behind the still-in-flight PAUSE's own awaited confirmation
    // (PAUSE_APPLY_DELAY_MS), then needs its own resume confirmation on top
    // (bounded advance -- isPlaying being true re-arms the 14s freeze-nudge
    // interval forever, so an unbounded runAllTimersAsync() would loop
    // indefinitely).
    await act(async () => { await vi.advanceTimersByTimeAsync(PAUSE_APPLY_DELAY_MS + RESUME_APPLY_DELAY_MS + 50); });

    // The end state must be deterministic and reflect the LAST click (play),
    // never a state where the two handlers stomped on each other mid-flight.
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
    expect(mockSpeechSynthesis.speaking && !mockSpeechSynthesis.paused).toBe(true);
  });

  it('resumes actual audio after a full pause-then-play, not just Redux state', async () => {
    const { store } = renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(store.getState().browserPlayer.isPlaying).toBe(true);

    const button = screen.getByTestId('play-button');

    // Pause and let it fully land on the real engine (not mid-flight this
    // time) -- reproduces "click pause, wait, then click play" exactly as
    // reported.
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve(); await Promise.resolve();
    });
    expect(store.getState().browserPlayer.isPlaying).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(PAUSE_APPLY_DELAY_MS + 100); });
    expect(mockSpeechSynthesis.paused).toBe(true);

    // Now click play again, well after the pause fully settled.
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve(); await Promise.resolve();
    });
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(RESUME_APPLY_DELAY_MS + 100); });

    // The bug: a plain CLICK_PLAY that calls speak() on a fresh utterance
    // instead of resume()-ing the still-loaded one leaves the real engine
    // sitting paused forever -- isPlaying says true, nothing is audible.
    expect(mockSpeechSynthesis.paused).toBe(false);
    expect(mockSpeechSynthesis.speaking).toBe(true);
  });

  it('recovers via the safety timeout when the browser never fires onpause/onresume at all', async () => {
    // Reproduces the actual reported bug: utterance.onpause/onresume are
    // documented as unreliable across real browsers -- some never fire them
    // for a given pause()/resume() call. Without a bounded fallback, the
    // queue's awaited engineAwaitPause()/engineAwaitResume() would then
    // never resolve, permanently stalling the queue -- so no later click,
    // on either the pause or the play button, would ever do anything again.
    firesPauseResumeEvents = false;

    const { store } = renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(store.getState().browserPlayer.isPlaying).toBe(true);

    const button = screen.getByTestId('play-button');

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve(); await Promise.resolve();
    });
    expect(store.getState().browserPlayer.isPlaying).toBe(false);

    // No onpause event will EVER come (firesPauseResumeEvents is false) --
    // only the safety timeout can unstick this. Advance past it.
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });

    // The queue must have moved on -- a second click now must actually do
    // something, not sit behind a permanently-stuck first await.
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve(); await Promise.resolve();
    });
    expect(store.getState().browserPlayer.isPlaying).toBe(true);

    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(mockSpeechSynthesis.speaking).toBe(true);
    expect(mockSpeechSynthesis.paused).toBe(false);
  });
});
