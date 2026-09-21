import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import reducer, {
  setSpellFile,
  setSpellInfo,
  setSpellLoaded,
  goToNextPage,
  goToPreviousPage,
  goToPage,
  resetSpellReader,
  setCurrentSentenceIndex,
  setSentences,
  invalidateSpellList,
  invalidateContent,
  setFitToWidth,
  setLightningMode,
} from '../spellReaderSlice';

const initial = reducer(undefined, { type: '@@INIT' });

describe('spellReaderSlice', () => {
  describe('setSpellFile', () => {
    it('sets spellId and title', () => {
      const state = reducer(initial, setSpellFile({ id: 'doc-1', title: 'My Doc' }));
      expect(state.spellId).toBe('doc-1');
      expect(state.spellTitle).toBe('My Doc');
    });

    it('restores currentPage and sentenceIndex from progress', () => {
      const state = reducer(initial, setSpellFile({
        id: 'doc-1',
        title: 'My Doc',
        progress: { currentPage: 5, lastReadSentenceIndex: 3, pagesProgress: [] },
      }));
      expect(state.currentPage).toBe(5);
      expect(state.currentSentenceIndex).toBe(3);
    });
  });

  describe('pagination', () => {
    const withPages = reducer(
      reducer(initial, setSpellInfo({ totalPages: 5 })),
      goToPage(3)
    );

    it('goToNextPage increments page', () => {
      const state = reducer(withPages, goToNextPage());
      expect(state.currentPage).toBe(4);
    });

    it('goToNextPage does not exceed totalPages', () => {
      const atLast = reducer(withPages, goToPage(5));
      const state = reducer(atLast, goToNextPage());
      expect(state.currentPage).toBe(5);
    });

    it('goToPreviousPage decrements page', () => {
      const state = reducer(withPages, goToPreviousPage());
      expect(state.currentPage).toBe(2);
    });

    it('goToPreviousPage does not go below 1', () => {
      const atFirst = reducer(withPages, goToPage(1));
      const state = reducer(atFirst, goToPreviousPage());
      expect(state.currentPage).toBe(1);
    });

    it('goToNextPage resets sentenceIndex to 0', () => {
      const withSentence = reducer(withPages, setCurrentSentenceIndex(7));
      const state = reducer(withSentence, goToNextPage());
      expect(state.currentSentenceIndex).toBe(0);
    });
  });

  describe('sentence index', () => {
    it('setCurrentSentenceIndex updates index', () => {
      const state = reducer(initial, setCurrentSentenceIndex(4));
      expect(state.currentSentenceIndex).toBe(4);
    });

    it('setSentences stores sentence array', () => {
      const sentences = ['Hello world.', 'Second sentence.'];
      const state = reducer(initial, setSentences({ sentences }));
      expect(state.sentences).toEqual(sentences);
    });
  });

  describe('invalidation counters', () => {
    it('invalidateSpellList increments listVersion', () => {
      const s1 = reducer(initial, invalidateSpellList());
      const s2 = reducer(s1, invalidateSpellList());
      expect(s2.listVersion).toBe(2);
    });

    it('invalidateContent increments contentVersion', () => {
      const state = reducer(initial, invalidateContent());
      expect(state.contentVersion).toBe(1);
    });
  });

  describe('preferences', () => {
    it('setFitToWidth updates flag', () => {
      const state = reducer(initial, setFitToWidth(false));
      expect(state.fitToWidth).toBe(false);
    });

    // TCORE-128: initial state is computed once at module load from localStorage, so each case
    // re-imports the slice fresh after seeding (or clearing) the saved preference.
    describe('fitToWidth default', () => {
      const freshInitialFitToWidth = async () => {
        vi.resetModules();
        const mod = await import('../spellReaderSlice');
        return mod.default(undefined, { type: '@@INIT' }).fitToWidth;
      };

      beforeEach(() => { localStorage.clear(); });
      afterEach(() => { localStorage.clear(); vi.resetModules(); });

      it('is off for a user with no saved preference', async () => {
        expect(await freshInitialFitToWidth()).toBe(false);
      });

      it('stays on for a user who saved it on', async () => {
        localStorage.setItem('reader:fitToWidth', 'true');
        expect(await freshInitialFitToWidth()).toBe(true);
      });

      it('stays off for a user who saved it off', async () => {
        localStorage.setItem('reader:fitToWidth', 'false');
        expect(await freshInitialFitToWidth()).toBe(false);
      });
    });

    it('setLightningMode updates flag', () => {
      const state = reducer(initial, setLightningMode(false));
      expect(state.lightningMode).toBe(false);
    });
  });

  describe('resetSpellReader', () => {
    it('returns to initial state', () => {
      const loaded = reducer(
        reducer(initial, setSpellFile({ id: 'x', title: 'X' })),
        setSpellLoaded(true)
      );
      const reset = reducer(loaded, resetSpellReader());
      expect(reset.spellId).toBeNull();
      expect(reset.isLoaded).toBe(false);
    });
  });
});
