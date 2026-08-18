import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SpellState } from 'src/interfaces';

const initialState: SpellState = {
  size: null,
  type: "",
  title: "",
  totalPages: 0,
  currentPage: 0,
  fileContent: null,
  isLoaded: false,
};

const spellSlice = createSlice({
  name: 'spell',
  initialState,
  reducers: {
    setSpellDetails(state, action: PayloadAction<{ fileContent: string; title: string; type?: string; size: number; totalPages: number }>) {
      state.type = action.payload.type;
      state.size = action.payload.size;
      state.title = action.payload.title;
      state.totalPages = action.payload.totalPages;
      state.fileContent = action.payload.fileContent;
      state.isLoaded = true;
    },
    resetSpellState() {
      return initialState;
    },
    setSpellTitle(state, action: PayloadAction<string>) {
      state.title = action.payload;
    }
  },
});

export const {
  setSpellDetails,
  resetSpellState,
  setSpellTitle,
} = spellSlice.actions;

export default spellSlice.reducer;
