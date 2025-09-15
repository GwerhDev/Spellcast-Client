import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PdfReaderState {
  fileContent: string | null;
  totalPages: number;
  currentPage: number;
  isLoaded: boolean;
  currentPageText: string | null;
}

const initialState: PdfReaderState = {
  fileContent: null,
  totalPages: 0,
  currentPage: 1,
  isLoaded: false,
  currentPageText: null,
};

const pdfReaderSlice = createSlice({
  name: 'pdfReader',
  initialState,
  reducers: {
    setPdfFile(state, action: PayloadAction<string | null>) {
      state.fileContent = action.payload;
      state.totalPages = 0;
      state.currentPage = 1;
      state.isLoaded = false;
      state.currentPageText = null;
    },
    setPdfDocumentInfo(state, action: PayloadAction<{ totalPages: number }>) {
      state.totalPages = action.payload.totalPages;
      state.isLoaded = true;
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
    resetPdfState(state) {
      state.fileContent = null;
      state.totalPages = 0;
      state.currentPage = 1;
      state.isLoaded = false;
      state.currentPageText = null;
    },
  setCurrentPageText(state, action: PayloadAction<string | null>) {
      state.currentPageText = action.payload;
    },
  },
});

export const {
  setPdfFile,
  setPdfDocumentInfo,
  goToNextPage,
  goToPreviousPage,
  goToPage,
  resetPdfState,
  setCurrentPageText,
} = pdfReaderSlice.actions;

export default pdfReaderSlice.reducer;