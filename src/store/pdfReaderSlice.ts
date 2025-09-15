import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PdfReaderState {
  file: File | null;
  totalPages: number;
  currentPage: number;
  isLoaded: boolean;
}

const initialState: PdfReaderState = {
  file: null,
  totalPages: 0,
  currentPage: 1,
  isLoaded: false,
};

const pdfReaderSlice = createSlice({
  name: 'pdfReader',
  initialState,
  reducers: {
    setPdfFile(state, action: PayloadAction<File | null>) {
      state.file = action.payload;
    },
    setPdfDocumentInfo(state, action: PayloadAction<{ totalPages: number }>) {
      state.totalPages = action.payload.totalPages;
      state.currentPage = 1;
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
      state.file = null;
      state.totalPages = 0;
      state.currentPage = 1;
      state.isLoaded = false;
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
} = pdfReaderSlice.actions;

export default pdfReaderSlice.reducer;