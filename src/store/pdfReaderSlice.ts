import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PdfReaderState {
  fileContent: string | null;
  totalPages: number;
  currentPage: number;
  isLoaded: boolean;
  pages: { [pageNumber: number]: string };
}

const initialState: PdfReaderState = {
  fileContent: null,
  totalPages: 0,
  currentPage: 1,
  isLoaded: false,
  pages: {},
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
      state.pages = {};
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
      state.pages = {};
    },
    setPageText(state, action: PayloadAction<{ pageNumber: number; text: string | null }>) {
        if (action.payload.text) {
            state.pages[action.payload.pageNumber] = action.payload.text;
        }
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
  setPageText,
} = pdfReaderSlice.actions;

export default pdfReaderSlice.reducer;