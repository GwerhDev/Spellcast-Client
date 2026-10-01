import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';
import { SpellProcessor } from '../../SpellProcessor';
import { setVoice } from '../../../../store/browserPlayerSlice';

// Picking another voice while reading: the sentence being read starts over with it right
// away, instead of the old voice finishing it first. With SpellProcessor alongside the
// player as in the app, publishing the page's sentences.
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

const timesSpoken = (text: string) =>
  mockSpeechSynthesis.speak.mock.calls.filter(([utterance]) => utterance.text === text).length;

const voiceNamed = (name: string) => ({ name, voiceURI: name, lang: 'en-US', localService: true, default: false }) as SpeechSynthesisVoice;

describe('BrowserPlayer changing voice', () => {
  it('reads the current sentence again with the new voice, right away', async () => {
    pages = [textPage('One a. One b.')];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 1 }) as never });
    await act(async () => { store.dispatch(setVoice(voiceNamed('Alpha'))); });
    await settle();
    expect(activeUtterance?.text).toBe('One a.');
    const cancelsBefore = mockSpeechSynthesis.cancel.mock.calls.length;

    await act(async () => { store.dispatch(setVoice(voiceNamed('Beta'))); });
    await settle();

    // The old voice was cut off, and the same sentence started over with the new one.
    expect(mockSpeechSynthesis.cancel.mock.calls.length).toBeGreaterThan(cancelsBefore);
    expect(activeUtterance?.text).toBe('One a.');
    expect((activeUtterance as unknown as { voice: SpeechSynthesisVoice }).voice.name).toBe('Beta');
    expect(timesSpoken('One a.')).toBeGreaterThanOrEqual(2);
    expect(timesSpoken('One b.')).toBe(0);
  });

  it('does not start reading when paused', async () => {
    pages = [textPage('One a. One b.')];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 1 }) as never });
    await act(async () => { store.dispatch(setVoice(voiceNamed('Alpha'))); });
    await settle();
    await act(async () => { fireEvent.click(screen.getByTestId('play-button')); });
    await settle();
    const spokenBefore = mockSpeechSynthesis.speak.mock.calls.length;

    await act(async () => { store.dispatch(setVoice(voiceNamed('Beta'))); });
    await settle();
    expect(mockSpeechSynthesis.speak.mock.calls.length).toBe(spokenBefore);
  });

  it('does not start the sentence over when the same voice is announced again', async () => {
    pages = [textPage('One a. One b.')];
    const { store } = renderWithProviders(<Reader />, { preloadedState: stateFor({ autoPlayOnLoad: true, totalPages: 1 }) as never });
    await act(async () => { store.dispatch(setVoice(voiceNamed('Alpha'))); });
    await settle();
    const spokenBefore = timesSpoken('One a.');

    // The voice list re-announcing itself hands over the same voice as a new object.
    await act(async () => { store.dispatch(setVoice(voiceNamed('Alpha'))); });
    await settle();
    expect(timesSpoken('One a.')).toBe(spokenBefore);
  });
});
