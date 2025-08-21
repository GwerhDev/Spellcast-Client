import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PdfReaderState {
  currentPage: number;
  totalPages: number;
  isLoaded: boolean;
}

const initialState: PdfReaderState = {
  currentPage: 1,
  totalPages: 0,
  isLoaded: false,
};

const pdfReaderSlice = createSlice({
  name: 'pdfReader',
  initialState,
  reducers: {
    setPdfDocumentInfo: (state, action: PayloadAction<{ totalPages: number }>) => {
      state.totalPages = action.payload.totalPages;
      state.currentPage = 1;
      state.isLoaded = true;
    },
    goToNextPage: (state) => {
      if (state.currentPage < state.totalPages) {
        state.currentPage += 1;
      }
    },
    goToPreviousPage: (state) => {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
      }
    },
    resetPdfState: (state) => {
      state.currentPage = 1;
      state.totalPages = 0;
      state.isLoaded = false;
    },
  },
});

export const {
  setPdfDocumentInfo,
  goToNextPage,
  goToPreviousPage,
  resetPdfState,
} = pdfReaderSlice.actions;

export default pdfReaderSlice.reducer;