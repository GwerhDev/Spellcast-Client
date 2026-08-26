import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
}));

// Counts constructions instead of relying on the setup.ts stub, so this
// suite can assert on exactly how many times a NEW MediaMetadata was ever
// built -- the setup.ts stub's plain `metadata` field can't be spied on as
// an assignment target the way a function call can.
let metadataConstructions = 0;
class CountingMediaMetadata {
  title: string; artist: string; album: string; artwork: unknown[];
  constructor(init: { title?: string; artist?: string; album?: string; artwork?: unknown[] }) {
    metadataConstructions++;
    this.title = init.title ?? '';
    this.artist = init.artist ?? '';
    this.album = init.album ?? '';
    this.artwork = init.artwork ?? [];
  }
}

let activeUtterance: { onend: (() => void) | null } | null = null;
let mockSpeaking = false;
const mockSpeechSynthesis = {
  get speaking() { return mockSpeaking; },
  paused: false,
  speak: vi.fn((u: typeof activeUtterance) => { activeUtterance = u; mockSpeaking = true; }),
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn(() => { mockSpeaking = false; }),
  getVoices: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

beforeEach(() => {
  metadataConstructions = 0;
  mockSpeaking = false;
  activeUtterance = null;
  vi.clearAllMocks();
  vi.stubGlobal('MediaMetadata', CountingMediaMetadata);
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

describe('BrowserPlayer does not re-create Media Session metadata on every sentence', () => {
  it('only builds a new MediaMetadata on real page/spell changes, not on an ordinary same-page sentence advance', async () => {
    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { preloadedState: baseState }
    );

    screen.getByTestId('browser-player');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled(); // sentence one started

    const constructionsAfterMount = metadataConstructions;
    expect(constructionsAfterMount).toBeGreaterThan(0); // at least the initial write happened

    // Sentence one ends -- advances to sentence two, STILL on page 1. Content
    // (title/cover/page-of-total) hasn't changed at all -- this must not
    // build a new MediaMetadata. Frequent reassignment is what was observed
    // to make real Chrome's OS/MPRIS bridge stop recognizing this page's own
    // session and fall back to its generic default, flickering the widget
    // every time a sentence changes.
    await act(async () => {
      activeUtterance!.onend!();
      await Promise.resolve(); await Promise.resolve();
    });
    expect(metadataConstructions).toBe(constructionsAfterMount);

    // A REAL page change must still update it.
    await act(async () => {
      fireEvent.click(screen.getByTestId('playback-next-btn'));
      await Promise.resolve(); await Promise.resolve();
    });
    expect(metadataConstructions).toBeGreaterThan(constructionsAfterMount);
  });
});
