import { describe, it, expect } from 'vitest';
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
