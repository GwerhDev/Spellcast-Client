import { describe, it, expect } from 'vitest';
import reducer, {
  setPdfFile,
  setPdfDocumentInfo,
  setPdfLoaded,
  goToNextPage,
  goToPreviousPage,
  goToPage,
  resetPdfReader,
  setCurrentSentenceIndex,
  setSentences,
  invalidateDocumentList,
  invalidateContent,
  setFitToWidth,
  setLightningMode,
} from '../pdfReaderSlice';

const initial = reducer(undefined, { type: '@@INIT' });

describe('pdfReaderSlice', () => {
  describe('setPdfFile', () => {
    it('sets documentId and title', () => {
      const state = reducer(initial, setPdfFile({ id: 'doc-1', title: 'My Doc' }));
      expect(state.documentId).toBe('doc-1');
      expect(state.documentTitle).toBe('My Doc');
    });

    it('restores currentPage and sentenceIndex from progress', () => {
      const state = reducer(initial, setPdfFile({
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
      reducer(initial, setPdfDocumentInfo({ totalPages: 5 })),
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
    it('invalidateDocumentList increments listVersion', () => {
      const s1 = reducer(initial, invalidateDocumentList());
      const s2 = reducer(s1, invalidateDocumentList());
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

  describe('resetPdfReader', () => {
    it('returns to initial state', () => {
      const loaded = reducer(
        reducer(initial, setPdfFile({ id: 'x', title: 'X' })),
        setPdfLoaded(true)
      );
      const reset = reducer(loaded, resetPdfReader());
      expect(reset.documentId).toBeNull();
      expect(reset.isLoaded).toBe(false);
    });
  });
});
