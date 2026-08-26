import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';

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

let mockSpeaking = false;
const mockSpeechSynthesis = {
  get speaking() { return mockSpeaking; },
  paused: false,
  speak: vi.fn(() => { mockSpeaking = true; }),
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn(() => { mockSpeaking = false; }),
  getVoices: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

beforeEach(() => {
  mockSpeaking = false;
  resolveGetSpellById = null;
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
  navigator.mediaSession.metadata = null;
});

const baseState = {
  session: { logged: true, userData: { loader: false, id: 'user-1' } },
  browserPlayer: {
    isPlaying: false,
    voice: null,
    volume: 1,
    // Mounted WITHOUT autoplay -- this suite is specifically about the
    // dedicated metadata effect, which fires on state changes regardless of
    // whether anything is playing, unlike the play-trigger gate covered by
    // BrowserPlayer.coverGate.test.tsx.
    autoPlayOnLoad: false,
    toggleSeq: 0,
    resumeSeq: 0,
    externalPauseSeq: 0,
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
};

describe('BrowserPlayer never writes Media Session metadata before the cover fetch settles', () => {
  it('leaves navigator.mediaSession.metadata untouched while the cover fetch is pending, even with no playback involved', async () => {
    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    expect(getSpellByIdMock).toHaveBeenCalled();
    // The dedicated metadata effect already had spellTitle/currentPage/
    // totalPages ready (synchronous Redux state) -- the bug was writing an
    // incomplete snapshot with those fields anyway, missing only artwork.
    // The fix must skip writing ANYTHING until the cover fetch settles.
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
