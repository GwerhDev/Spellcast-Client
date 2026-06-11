import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DesktopState {
  /** When true, the app is minimized to a floating window over the NHEXA desktop. */
  minimized: boolean;
}

const initialState: DesktopState = {
  minimized: false,
};

const desktopSlice = createSlice({
  name: 'desktop',
  initialState,
  reducers: {
    setMinimized: (state, action: PayloadAction<boolean>) => {
      state.minimized = action.payload;
    },
    toggleMinimized: (state) => {
      state.minimized = !state.minimized;
    },
  },
});

export const { setMinimized, toggleMinimized } = desktopSlice.actions;
export default desktopSlice.reducer;
