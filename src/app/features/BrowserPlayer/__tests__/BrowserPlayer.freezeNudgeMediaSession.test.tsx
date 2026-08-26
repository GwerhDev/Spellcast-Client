import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
}));

// Mirrors BrowserPlayer.eventQueue.test.tsx's mock: real onpause/onresume
// firing (with a short, controllable delay) so the queue's awaited
// engineAwaitPause/engineAwaitResume have something real to resolve on.
const PAUSE_APPLY_DELAY_MS = 50;
const RESUME_APPLY_DELAY_MS = 50;
let mockSpeaking = false;
let mockPaused = false;
let activeUtterance: { onpause: ((e: unknown) => void) | null; onresume: ((e: unknown) => void) | null } | null = null;

const mockSpeechSynthesis = {
  get speaking() { return mockSpeaking; },
  get paused() { return mockPaused; },
  speak: vi.fn((u: typeof activeUtterance) => { activeUtterance = u; mockSpeaking = true; mockPaused = false; }),
  pause: vi.fn(() => {
    setTimeout(() => { mockPaused = true; activeUtterance?.onpause?.(new Event('pause')); }, PAUSE_APPLY_DELAY_MS);
  }),
  resume: vi.fn(() => {
    setTimeout(() => { mockPaused = false; activeUtterance?.onresume?.(new Event('resume')); }, RESUME_APPLY_DELAY_MS);
  }),
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

describe('BrowserPlayer reasserts Media Session state after the freeze-nudge pause/resume cycle', () => {
  it('re-registers the OS action handlers after each ~14s freeze nudge, without any page change', async () => {
    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    const setActionHandlerSpy = vi.spyOn(navigator.mediaSession, 'setActionHandler');
    setActionHandlerSpy.mockClear();

    // Advance past one freeze-nudge cycle: the 14s interval fires, then the
    // nudge's own pause (50ms) and resume (50ms) need to land.
    await act(async () => { await vi.advanceTimersByTimeAsync(14_000 + PAUSE_APPLY_DELAY_MS + RESUME_APPLY_DELAY_MS + 10); });

    // No page turn happened at all -- this is purely the freeze-nudge's own
    // pause()+resume() cycle, which must reassert the handlers on its own.
    expect(setActionHandlerSpy).toHaveBeenCalledWith('play', expect.any(Function));
    expect(setActionHandlerSpy).toHaveBeenCalledWith('pause', expect.any(Function));
  });
});
