import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';
import { SpellProcessor } from '../../SpellProcessor';
import { setVoice } from '../../../../store/browserPlayerSlice';
import { setCurrentSentenceIndex } from '../../../../store/spellReaderSlice';

// A network voice cut while it's still saying a sentence (a sentence clicked, another voice)
// and told the new one in the same instant gives the new one no start nor end: the reading
// would stay on it forever. So the player stops as a pause does and starts as a play does,
// waiting for the voice's own onstart -- and the reading goes on from there. A local voice
// keeps cutting and speaking right away.
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

type FakeUtterance = SpeechSynthesisUtterance & { onstart: (() => void) | null; onend: (() => void) | null };
let activeUtterance: FakeUtterance | null = null;
const mockSpeechSynthesis = {
  speaking: false,
  paused: false,
  speak: vi.fn((u: FakeUtterance) => { activeUtterance = u; }),
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn(() => { activeUtterance = null; }),
  getVoices: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mediaSession = { metadata: null as unknown, playbackState: 'none' as MediaSessionPlaybackState, setActionHandler: () => {} };

beforeEach(() => {
  activeUtterance = null;
  vi.clearAllMocks();
  mediaSession.playbackState = 'none';
  Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: mediaSession });
  vi.stubGlobal('MediaMetadata', class { constructor(public init: unknown) {} });
  // The silent anchor: playing it is how the tab takes the media session back.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => {});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
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

const stateFor = () => ({
  session: { logged: true, userData: { id: 'user-1', loader: false } },
  browserPlayer: { isPlaying: false, voice: null, volume: 1, autoPlayOnLoad: true, toggleSeq: 0, resumeSeq: 0, externalPauseSeq: 0 },
  spellReader: {
    spellId: 'spell-1', spellTitle: 'Test Spell', totalPages: 1, currentPage: 1,
    isLoaded: false, hasInitialPageSet: true, showSearcher: false, currentPageText: '',
    currentSentenceIndex: 0, sentences: [] as string[], showReaderSettings: false, fitToWidth: false,
    lightningMode: true, attentionGuardEnabled: false, attentionGuardInterval: 15, showAttentionGuard: false,
    activitySeq: 0, contentVersion: 0, listVersion: 0,
  },
});

const Reader = () => (<><SpellProcessor /><BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} /></>);

// The spell read, the page publish and the player's queue each settle on their own promise.
const settle = async () => {
  for (let i = 0; i < 6; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
};

const voice = (name: string, localService: boolean) => ({ name, voiceURI: name, lang: 'en-US', localService, default: false }) as SpeechSynthesisVoice;

// The voice confirms it's sounding, or that it finished, as the real engine does.
const started = async () => { await act(async () => { activeUtterance!.onstart?.(); }); await settle(); };
const ended = async () => { await act(async () => { activeUtterance!.onend?.(); }); await settle(); };

// Reading the first sentence, its start confirmed by the voice.
const readingFirst = async (v: SpeechSynthesisVoice) => {
  pages = [textPage('Zero. One. Two. Three. Four.')];
  const rendered = renderWithProviders(<Reader />, { preloadedState: stateFor() as never });
  await act(async () => { rendered.store.dispatch(setVoice(v)); });
  await settle();
  expect(activeUtterance?.text).toBe('Zero.');
  await started();
  expect(rendered.store.getState().browserPlayer.isPlaying).toBe(true);
  expect(mediaSession.playbackState).toBe('playing');
  return rendered;
};

describe('BrowserPlayer cutting a network voice mid-sentence', () => {
  it('a sentence clicked: stops as a pause does, waits for its start, and reads on from it', async () => {
    const { store } = await readingFirst(voice('Google US English', false));
    const cancels = mockSpeechSynthesis.cancel.mock.calls.length;

    await act(async () => { store.dispatch(setCurrentSentenceIndex(3)); });
    await settle();
    expect(mockSpeechSynthesis.cancel.mock.calls.length).toBeGreaterThan(cancels);
    expect(activeUtterance?.text).toBe('Three.');
    // Waiting for the voice to confirm, as after a play: not yet "playing" for the OS.
    expect(mediaSession.playbackState).toBe('paused');

    await started();
    expect(mediaSession.playbackState).toBe('playing');
    expect(store.getState().browserPlayer.isPlaying).toBe(true);

    // Its end moves the reading on: it doesn't stay on the sentence clicked.
    await ended();
    expect(store.getState().spellReader.currentSentenceIndex).toBe(4);
    expect(activeUtterance?.text).toBe('Four.');
  });

  it('another voice: the same, the sentence read again with it', async () => {
    const { store } = await readingFirst(voice('Google US English', false));

    await act(async () => { store.dispatch(setVoice(voice('Google UK English Female', false))); });
    await settle();
    expect(activeUtterance?.text).toBe('Zero.');
    expect((activeUtterance as unknown as { voice: SpeechSynthesisVoice }).voice.name).toBe('Google UK English Female');
    expect(mediaSession.playbackState).toBe('paused');

    await started();
    expect(mediaSession.playbackState).toBe('playing');
    await ended();
    expect(activeUtterance?.text).toBe('One.');
  });

  it('a local voice keeps cutting and speaking right away', async () => {
    const { store } = await readingFirst(voice('Local voice', true));
    const anchorPlays = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;

    await act(async () => { store.dispatch(setCurrentSentenceIndex(3)); });
    await settle();
    expect(activeUtterance?.text).toBe('Three.');
    // Never through a pause: still "playing", and the tab didn't take its session back.
    expect(mediaSession.playbackState).toBe('playing');
    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length).toBe(anchorPlays);

    await ended();
    expect(activeUtterance?.text).toBe('Four.');
  });
});
