import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DocumentState } from 'src/interfaces';

const initialState: DocumentState = {
  size: null,
  type: "",
  title: "",
  totalPages: 0,
  currentPage: 0,
  fileContent: null,
  isLoaded: false,
};

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    setDocumentDetails(state, action: PayloadAction<{ fileContent: string; title: string; type?: string; size: number; totalPages: number }>) {
      state.type = action.payload.type;
      state.size = action.payload.size;
      state.title = action.payload.title;
      state.totalPages = action.payload.totalPages;
      state.fileContent = action.payload.fileContent;
      state.isLoaded = true;
    },
    resetDocumentState() {
      return initialState;
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