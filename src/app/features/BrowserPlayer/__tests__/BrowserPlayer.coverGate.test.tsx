import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';

// A controllable, never-auto-resolving getSpellById -- lets a test hold the
// cover fetch open indefinitely to prove playback genuinely waits for it.
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
});

const baseState = {
  session: { logged: true, userData: { loader: false, id: 'user-1' } },
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

describe('BrowserPlayer waits for the cover fetch before the first autoplay-triggered speech', () => {
  it('does not call speak() until the cover fetch settles, so the first Media Session write is already complete', async () => {
    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    // The cover fetch is still deliberately unresolved -- nothing must have
    // started speaking yet, or the Media Session metadata for this spell
    // will have already been announced once with empty artwork.
    expect(getSpellByIdMock).toHaveBeenCalled();
    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();

    // Cover fetch settles (with a real cover, in this case).
    await act(async () => {
      resolveGetSpellById!({ cover: new Blob(['a']) });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });

    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
  });
});
