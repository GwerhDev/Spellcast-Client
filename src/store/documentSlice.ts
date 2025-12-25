import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DocumentState {
  fileContent: string | null;
  title: string | null;
  size: number | null;
  totalPages: number;
  currentPage: number;
  isLoaded: boolean;
  pages: { [pageNumber: number]: string };
}

const initialState: DocumentState = {
  fileContent: null,
  title: null,
  size: null,
  totalPages: 1,
  currentPage: 1,
  isLoaded: false,
  pages: {},
};

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    setDocumentDetails(state, action: PayloadAction<{ fileContent: string; title: string; size: number; totalPages: number }>) {
      state.fileContent = action.payload.fileContent;
      state.title = action.payload.title;
      state.size = action.payload.size;
      state.totalPages = action.payload.totalPages;
      state.isLoaded = true;
    },
    resetDocumentState(state) {
      state.fileContent = null;
      state.title = null;
      state.size = null;
      state.totalPages = 0;
      state.currentPage = 1;
      state.isLoaded = false;
      state.pages = {};
    },
    setDocumentTitle(state, action: PayloadAction<string>) {
      state.title = action.payload;
    }
  },
});

export const {
  setDocumentDetails,
  resetDocumentState,
  setDocumentTitle,
} = documentSlice.actions;

export default documentSlice.reducer;