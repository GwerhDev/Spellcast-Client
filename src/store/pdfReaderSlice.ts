import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  currentPageText: string | null;
}

const initialState: PdfReaderState = {
  documentId: null,
  documentTitle: null,
  totalPages: 0,
  currentPage: 1,
  isLoaded: false,
  pages: {},
  currentPageText: null,
  hasInitialPageSet: false, // Initialize new flag
  isContinuousPlayActive: false,
  showPageSelector: false,
};

const pdfReaderSlice = createSlice({
  name: 'pdfReader',
  initialState,
  reducers: {
    setPdfFile(state, action: PayloadAction<{ id: string, title: string }>) {
      state.documentId = action.payload.id;
      state.documentTitle = action.payload.title;
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
      }
    },
    goToPreviousPage(state) {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
      }
    },
    goToPage(state, action: PayloadAction<number>) {
      state.currentPage = action.payload;
    },
    resetPdfReader() {
      return initialState;
    },
    setPageText(state, action: PayloadAction<{ text: string }>) {
      state.currentPageText = action.payload.text;
    },
    setHasInitialPageSet(state, action: PayloadAction<boolean>) { // New action
      state.hasInitialPageSet = action.payload;
    },
    setContinuousPlay(state, action: PayloadAction<boolean>) {
      state.isContinuousPlayActive = action.payload;
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
  setPdfLoaded,
  setHasInitialPageSet,
  setContinuousPlay,
  setShowPageSelector,
} = pdfReaderSlice.actions;

export default pdfReaderSlice.reducer;