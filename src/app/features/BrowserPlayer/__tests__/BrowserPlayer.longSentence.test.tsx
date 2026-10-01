import { describe, it, expect, vi, beforeEach, onTestFinished } from 'vitest';
import { act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';
import { SpellProcessor } from '../../SpellProcessor';
import { speechChunkBudget } from '../../../../utils/speechChunks';

// A long sentence is spoken as a few shorter utterances, so Chrome's ~15s continuous-speech
// freeze never comes (nor the nudge that cut a word in half to prevent it). With
// SpellProcessor alongside the player as in the app, publishing the page's sentences.
const textPage = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

let pages: object[] = [];
vi.mock('../../../../db', () => ({
  getSpellById: vi.fn(async () => ({ id: 'spell-1', title: 'Test Spell', userId: 'user-1', pagesContent: JSON.stringify(pages) })),
  getSpellCover: vi.fn(async () => null),
  updateSpellProgress: vi.fn(async () => {}),
}));
vi.mock('../../../../utils/pdfUtils', async (original) => ({
  ...(await original() as object),
  injectCoverIntoPages: async (spellPages: unknown) => spellPages,
}));

let activeUtterance: SpeechSynthesisUtterance | null = null;
const mockSpeechSynthesis = {
  speaking: false,
  paused: false,
  speak: vi.fn((u: SpeechSynthesisUtterance) => { activeUtterance = u; }),
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn(() => { activeUtterance = null; }),
  getVoices: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// The headset / OS media keys reach the player through these handlers.
let mediaHandlers: Record<string, () => void> = {};

beforeEach(() => {
  activeUtterance = null;
  mediaHandlers = {};
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'mediaSession', {
    configurable: true,
    value: {
      metadata: null,
      playbackState: 'none',
      setActionHandler: (action: string, handler: (() => void) | null) => { if (handler) mediaHandlers[action] = handler; },
    },
  });
  vi.stubGlobal('MediaMetadata', class { constructor(public init: unknown) {} });
  Object.defineProperty(window, 'speechSynthesis', { value: mockSpeechSynthesis, writable: true });
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string;
    onend: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    onpause: ((e: unknown) => void) | null = null;
    onresume: ((e: unknown) => void) | null = null;
    onstart: (() => void) | null = null;
    voice: unknown = null;
    volume = 1;
    constructor(text: string) { this.text = text; }
  });
});

const stateFor = (overrides: { autoPlayOnLoad?: boolean; totalPages: number; isLoaded?: boolean }) => ({
  session: { logged: true, userData: { id: 'user-1', loader: false } },
  browserPlayer: {
    isPlaying: false, voice: null, volume: 1, autoPlayOnLoad: overrides.autoPlayOnLoad ?? false,
    toggleSeq: 0, resumeSeq: 0, externalPauseSeq: 0,
  },
  spellReader: {
    spellId: 'spell-1', spellTitle: 'Test Spell', totalPages: overrides.totalPages, currentPage: 1,
    isLoaded: overrides.isLoaded ?? false, hasInitialPageSet: true, showSearcher: false, currentPageText: '',
    currentSentenceIndex: 0, sentences: [] as string[], showReaderSettings: false, fitToWidth: false,
    lightningMode: true, attentionGuardEnabled: false, attentionGuardInterval: 15, showAttentionGuard: false,
    activitySeq: 0, contentVersion: 0, listVersion: 0,
  },
});

const player = <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />;
const Reader = () => (<><SpellProcessor />{player}</>);

// The spell read, the page publish and the player's queue each settle on their own promise.
const settle = async () => {
  for (let i = 0; i < 6; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
};

// The engine finishing the sentence it's speaking.
const endSentence = async () => {
  await act(async () => { (activeUtterance as unknown as { onend?: () => void } | null)?.onend?.(); });
  await settle();
};

const longSentence = Array.from({ length: 60 }, (_, i) => `word${i + 1}`).join(' ') + '.';

describe('BrowserPlayer reading a long sentence', () => {
  it('speaks it in pieces, then moves on to the next sentence', async () => {
    pages = [textPage(`${longSentence} Next one.`)];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 1 }) as never });
    await settle();

    const pieces: string[] = [];
    // Every piece is spoken in turn while the sentence being read stays the same.
    for (let i = 0; i < 5 && activeUtterance && activeUtterance.text !== 'Next one.'; i++) {
      pieces.push(activeUtterance.text);
      expect(store.getState().spellReader.currentSentenceIndex).toBe(0);
      await endSentence();
    }
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.join(' ')).toBe(longSentence);
    // Before the voice has been timed (the engine here never says when it starts), each
    // piece is sized for a slow voice.
    pieces.forEach(piece => expect(piece.length).toBeLessThanOrEqual(speechChunkBudget()));
    expect(activeUtterance?.text).toBe('Next one.');
    expect(store.getState().spellReader.currentSentenceIndex).toBe(1);
  });

  it('a short sentence is still a single utterance', async () => {
    pages = [textPage('Short one. Another.')];
    renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 1 }) as never });
    await settle();
    expect(activeUtterance?.text).toBe('Short one.');
    await endSentence();
    expect(activeUtterance?.text).toBe('Another.');
  });

  // Sized from how fast the voice in use actually speaks: timed on each piece it says from
  // its own start to its own end.
  it('sizes the next pieces from the voice\'s measured pace', async () => {
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    onTestFinished(() => clock.mockRestore());
    const second = Array.from({ length: 60 }, (_, i) => `next${i + 1}`).join(' ') + '.';
    pages = [textPage(`${longSentence} ${second}`)];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 1 }) as never });
    await settle();

    // A fast voice: every piece of the first sentence said in 2s.
    const sayFast = async () => {
      const u = activeUtterance as unknown as { onstart?: () => void; onend?: () => void };
      await act(async () => { u.onstart?.(); });
      now += 2000;
      await act(async () => { u.onend?.(); });
      await settle();
    };
    const firstPieces: string[] = [];
    while (store.getState().spellReader.currentSentenceIndex === 0) {
      firstPieces.push(activeUtterance!.text);
      await sayFast();
    }
    expect(firstPieces.every(piece => piece.length <= speechChunkBudget())).toBe(true);
    // The next sentence comes in bigger pieces, as fast a voice keeps them well under the freeze.
    expect(activeUtterance!.text.length).toBeGreaterThan(speechChunkBudget());
  });
});

