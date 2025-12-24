import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DocumentState {
  fileContent: string | null;
  totalPages: number;
  currentPage: number;
  isLoaded: boolean;
  pages: { [pageNumber: number]: string };
}

const initialState: DocumentState = {
  fileContent: null,
  totalPages: 0,
  currentPage: 1,
  isLoaded: false,
  pages: {},
};

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    setDocumentFile(state, action: PayloadAction<string | null>) {
      state.fileContent = action.payload;
      state.totalPages = 0;
      state.currentPage = 1;
      state.isLoaded = false;
      state.pages = {};
    },
    resetDocumentState(state) {
      state.fileContent = null;
      state.totalPages = 0;
      state.currentPage = 1;
      state.isLoaded = false;
      state.pages = {};
    },
    setDocumentInfo(state, action: PayloadAction<{ totalPages: number }>) {
      state.totalPages = action.payload.totalPages;
      state.isLoaded = true;
    },
    setPageText(state, action: PayloadAction<{ pageNumber: number; text: string | null }>) {
      if (action.payload.text) {
        state.pages[action.payload.pageNumber] = action.payload.text;
      }
    },
  },
});

export const {
  setPageText,
  setDocumentInfo,
  setDocumentFile,
  resetDocumentState,
} = documentSlice.actions;

export default documentSlice.reducer;