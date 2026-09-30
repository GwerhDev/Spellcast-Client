import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';
import { SpellProcessor } from '../../SpellProcessor';

// Page turns, with SpellProcessor mounted alongside the player as in the app: it's what
// publishes each page's sentences, a render after the page number changes.
//
// A page with no text (a cover, an illustration) has no sentences. Starting playback ON
// such a page used to mark the player as playing and stop there: nothing to speak, so no
// sentence ever ended, and nothing turned the page.
const textPage = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const coverPage = { type: 'doc', content: [{ type: 'image', attrs: { src: 'cover.png' } }] };

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
const timesSpoken = (text: string) =>
  mockSpeechSynthesis.speak.mock.calls.filter(([utterance]) => utterance.text === text).length;

// The page number and the page's sentences arrive in separate renders; reacting to both
// spoke the new page's first sentence, cancelled it and spoke it again.
describe('BrowserPlayer turning the page', () => {
  it("speaks the new page's first sentence once, not once per render of the turn", async () => {
    pages = [textPage('One a. One b.'), textPage('Two a. Two b.')];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 2 }) as never });
    await settle();
    await endSentence(); // One a.
    await endSentence(); // One b. -> turns the page

    expect(store.getState().spellReader.currentPage).toBe(2);
    expect(activeUtterance?.text).toBe('Two a.');
    expect(timesSpoken('Two a.')).toBe(1);
    expect(timesSpoken('One a.')).toBe(1);
  });

  it('starts once on the page after a textless one in the middle of the read', async () => {
    pages = [textPage('One.'), coverPage, textPage('Three.'), textPage('Four.')];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 4 }) as never });
    await settle();
    await endSentence(); // One. -> page 2 (no text) -> page 3

    expect(store.getState().spellReader.currentPage).toBe(3);
    expect(timesSpoken('Three.')).toBe(1);
  });

  it('a page turned by hand while playing drops the old sentence and starts the new page once', async () => {
    pages = [textPage('One a. One b.'), textPage('Two a. Two b.')];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 2 }) as never });
    await settle();
    expect(activeUtterance?.text).toBe('One a.');

    await act(async () => { fireEvent.click(screen.getByTestId('playback-next-btn')); });
    await settle();

    expect(store.getState().spellReader.currentPage).toBe(2);
    expect(activeUtterance?.text).toBe('Two a.');
    expect(timesSpoken('Two a.')).toBe(1);
  });
});

describe('BrowserPlayer on a page with no text', () => {
  it('autoplay starting on a cover moves on and reads the next page', async () => {
    pages = [coverPage, textPage('Page two first. Page two second.'), textPage('Page three.')];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 3 }) as never });
    await settle();

    expect(store.getState().spellReader.currentPage).toBe(2);
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
    expect(activeUtterance?.text).toBe('Page two first.');
    expect(timesSpoken('Page two first.')).toBe(1);
  });

  it('pressing play on a cover moves on and reads the next page', async () => {
    pages = [coverPage, textPage('Page two first. Page two second.'), textPage('Page three.')];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ totalPages: 3 }) as never });
    await settle();
    expect(store.getState().spellReader.currentPage).toBe(1);

    await act(async () => { fireEvent.click(screen.getByTestId('play-button')); });
    await settle();

    expect(store.getState().spellReader.currentPage).toBe(2);
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
    expect(activeUtterance?.text).toBe('Page two first.');
  });

  it('skips every textless page in a row, without skipping the first one that has text', async () => {
    pages = [coverPage, coverPage, textPage('Page three.'), textPage('Page four.')];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 4 }) as never });
    await settle();

    expect(store.getState().spellReader.currentPage).toBe(3);
    expect(activeUtterance?.text).toBe('Page three.');
  });

  it('stops instead of turning the page when the textless page is the last one', async () => {
    pages = [coverPage];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ totalPages: 1 }) as never });
    await settle();

    await act(async () => { fireEvent.click(screen.getByTestId('play-button')); });
    await settle();

    expect(store.getState().spellReader.currentPage).toBe(1);
    expect(store.getState().browserPlayer.isPlaying).toBe(false);
    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
  });

  // No sentences yet because the pages are still being read is not a textless page: play
  // must wait for them, not turn the page. The on-screen button is disabled until then, so
  // this can only arrive from the headset / OS media keys.
  it('does not turn the page when a headset play arrives before the pages are loaded', async () => {
    const { store } = renderWithProviders(player, { preloadedState: stateFor({ totalPages: 3, isLoaded: false }) as never });
    await settle();
    await act(async () => { mediaHandlers.play(); });
    await settle();

    expect(store.getState().spellReader.currentPage).toBe(1);
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
  });
});
