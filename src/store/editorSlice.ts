import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface EditorState {
  showEditorSettings: boolean;
  autoSave: boolean;
}

const initialState: EditorState = {
  showEditorSettings: false,
  autoSave: localStorage.getItem('editor:autoSave') === 'true',
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setShowEditorSettings(state, action: PayloadAction<boolean>) {
      state.showEditorSettings = action.payload;
    },
    setAutoSave(state, action: PayloadAction<boolean>) {
      state.autoSave = action.payload;
    },
  },
});

export const { setShowEditorSettings, setAutoSave } = editorSlice.actions;
export default editorSlice.reducer;
