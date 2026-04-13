import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DocumentProgress } from '../interfaces';

interface PdfReaderState {
  documentId: string | null;
  documentTitle: string | null;
  totalPages: number;
  currentPage: number;
  isLoaded: boolean;
  pages: { [pageNumber: number]: string };
  hasInitialPageSet: boolean; // New flag
  isContinuousPlayActive: boolean;
  showPageSelector: boolean;
  currentPageText: string;
  progress?: DocumentProgress; // Add progress to state
  currentSentenceIndex: number;
  sentences: string[];
  showReaderSettings: boolean;
  fitToWidth: boolean;
}

const initialState: PdfReaderState = {
  documentId: null,
  documentTitle: null,
  totalPages: 1,
  currentPage: 1,
  isLoaded: false,
  pages: {},
  sentences: [],
  currentSentenceIndex: -1, // Use -1 to indicate nothing is highlighted initially
  currentPageText: "",
  hasInitialPageSet: false, // Initialize new flag
  isContinuousPlayActive: false,
  showPageSelector: false,
  showReaderSettings: false,
  fitToWidth: localStorage.getItem('reader:fitToWidth') !== 'false',
  progress: {
    currentPage: 1,
    pagesProgress: [],
    lastReadSentenceIndex: 0,
  } // Initialize progress
};

const pdfReaderSlice = createSlice({
  name: 'pdfReader',
  initialState,
  reducers: {
    setPdfFile(state, action: PayloadAction<{ id: string, title: string, progress?: DocumentProgress }>) {
      state.documentId = action.payload.id;
      state.documentTitle = action.payload.title;
      state.progress = action.payload.progress;
      if (action.payload.progress) {
        state.currentPage = action.payload.progress.currentPage || 1;
        state.currentSentenceIndex = action.payload.progress.lastReadSentenceIndex || 0;
      }
    },
    setSentences: (state, action: PayloadAction<{ sentences: string[], startIndex?: number }>) => {
      state.sentences = action.payload.sentences;
    },
    setCurrentSentenceIndex: (state, action: PayloadAction<number>) => {
      state.currentSentenceIndex = action.payload;
    },
    setPdfLoaded(state, action: PayloadAction<boolean>) {
      state.isLoaded = action.payload;
    },
    setPdfDocumentInfo(state, action: PayloadAction<{ totalPages: number }>) {
      state.totalPages = action.payload.totalPages;
    },
    setShowPageSelector(state, action: PayloadAction<boolean>) {
      state.showPageSelector = action.payload;
    },
    goToNextPage(state) {
      if (state.currentPage < state.totalPages) {
        state.currentPage += 1;
        state.currentSentenceIndex = 0;
      }
    },
    goToPreviousPage(state) {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
        state.currentSentenceIndex = 0;
      }
    },
    goToPage(state, action: PayloadAction<number>) {
      if (state.currentPage === action.payload) return;
      state.currentPage = action.payload;
      state.currentSentenceIndex = state.progress?.currentPage === action.payload ? state.progress.lastReadSentenceIndex : 0;
    },
    resetPdfReader() {
      return initialState;
    },
    setPageText(state, action: PayloadAction<{ text: string }>) {
      state.currentPageText = action.payload.text;
    },
    setPagesCache(state, action: PayloadAction<{ [pageNumber: number]: string }>) {
      state.pages = { ...state.pages, ...action.payload };
    },
    setHasInitialPageSet(state, action: PayloadAction<boolean>) { // New action
      state.hasInitialPageSet = action.payload;
    },
    setContinuousPlay(state, action: PayloadAction<boolean>) {
      state.isContinuousPlayActive = action.payload;
    },
    setShowReaderSettings(state, action: PayloadAction<boolean>) {
      state.showReaderSettings = action.payload;
    },
    setFitToWidth(state, action: PayloadAction<boolean>) {
      state.fitToWidth = action.payload;
    },
  },
});

export const {
  setPdfFile,
  setPdfDocumentInfo,
  goToNextPage,
  goToPreviousPage,
  goToPage,
  resetPdfReader,
  setPageText,
  setPagesCache,
  setPdfLoaded,
  setHasInitialPageSet,
  setContinuousPlay,
  setShowPageSelector,
  setSentences,
  setCurrentSentenceIndex,
  setShowReaderSettings,
  setFitToWidth,
} = pdfReaderSlice.actions;

export default pdfReaderSlice.reducer;