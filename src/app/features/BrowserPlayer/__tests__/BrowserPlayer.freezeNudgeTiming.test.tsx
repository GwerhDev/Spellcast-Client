import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
}));

let mockSpeaking = false;
let mockPaused = false;
let activeUtterance: { onend: (() => void) | null; onpause: ((e: unknown) => void) | null; onresume: ((e: unknown) => void) | null } | null = null;

const mockSpeechSynthesis = {
  get speaking() { return mockSpeaking; },
  get paused() { return mockPaused; },
  speak: vi.fn((u: typeof activeUtterance) => { activeUtterance = u; mockSpeaking = true; mockPaused = false; }),
  pause: vi.fn(() => { mockPaused = true; activeUtterance?.onpause?.(new Event('pause')); }),
  resume: vi.fn(() => { mockPaused = false; activeUtterance?.onresume?.(new Event('resume')); }),
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
    currentPageText: 'One. Two. Three. Four. Five. Six.',
    currentSentenceIndex: 0,
    sentences: ['One.', 'Two.', 'Three.', 'Four.', 'Five.', 'Six.'],
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

describe('BrowserPlayer freeze-nudge timing', () => {
  it('does not nudge (pause/resume the live engine) across many short sentences that individually reset the clock', async () => {
    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();

    // 5 sentences finish, each 3s apart (well under the 14s window), for a
    // combined 15s+ of continuous PLAYING state -- the old blanket
    // "setInterval every 14s while isPlaying" would have fired a real
    // pause()+resume() cycle in here. It must not: each new sentence resets
    // the clock, and no single one runs anywhere near 14s.
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
        activeUtterance!.onend!();
        await Promise.resolve(); await Promise.resolve();
      });
    }

    expect(mockSpeechSynthesis.pause).not.toHaveBeenCalled();
    expect(mockSpeechSynthesis.resume).not.toHaveBeenCalled();
  });

  it('still nudges a single utterance that keeps running past 14s uninterrupted', async () => {
    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();

    // The SAME utterance (sentence one) just keeps going -- onend never
    // fires. After 14s, the real freeze-workaround must still kick in.
    await act(async () => { await vi.advanceTimersByTimeAsync(14_100); });

    expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
    expect(mockSpeechSynthesis.resume).toHaveBeenCalled();
  });
});
