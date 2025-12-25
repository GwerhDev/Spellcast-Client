import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PdfReaderState {
  documentId: string | null;
  documentTitle: string | null;
  fileContent: string | null;
  totalPages: number;
  currentPage: number;
  isLoaded: boolean;
  pages: { [pageNumber: number]: string };
  hasInitialPageSet: boolean; // New flag
  isContinuousPlayActive: boolean;
  playbackTrigger: number;
}

const initialState: PdfReaderState = {
  documentId: null,
  documentTitle: null,
  fileContent: null,
  totalPages: 0,
  currentPage: 1,
  isLoaded: false,
  pages: {},
  hasInitialPageSet: false, // Initialize new flag
  isContinuousPlayActive: false,
  playbackTrigger: 0,
};

const pdfReaderSlice = createSlice({
  name: 'pdfReader',
  initialState,
  reducers: {
    setPdfFile(state, action: PayloadAction<{ id: string, content: string | null, title: string }>) {
      state.documentId = action.payload.id;
      state.fileContent = action.payload.content;
      state.documentTitle = action.payload.title;
    },
    setPdfLoaded(state, action: PayloadAction<boolean>) {
      state.isLoaded = action.payload;
    },
    setPdfDocumentInfo(state, action: PayloadAction<{ totalPages: number }>) {
      state.totalPages = action.payload.totalPages;
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
      if (action.payload >= 1 && action.payload <= state.totalPages) {
        state.currentPage = action.payload;
      }
    },
    resetPdfReader() {
      return initialState;
    },
    setPageText(state, action: PayloadAction<{ pageNumber: number; text: string | null }>) {
        if (action.payload.text) {
            state.pages[action.payload.pageNumber] = action.payload.text;
        }
    },
    setHasInitialPageSet(state, action: PayloadAction<boolean>) { // New action
      state.hasInitialPageSet = action.payload;
    },
    setContinuousPlay(state, action: PayloadAction<boolean>) {
      state.isContinuousPlayActive = action.payload;
    },
    startPlayback(state) {
      state.playbackTrigger += 1;
    }
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
  startPlayback,
} = pdfReaderSlice.actions;

export default pdfReaderSlice.reducer;