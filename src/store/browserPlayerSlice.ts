import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BrowserPlayerState {
  isPlaying: boolean;
  voice: SpeechSynthesisVoice | null;
  volume: number;
}

const initialState: BrowserPlayerState = {
  isPlaying: false,
  voice: null,
  volume: 1,
};

const browserPlayerSlice = createSlice({
  name: 'browserPlayer',
  initialState,
  reducers: {
    resetBrowserPlayer: () => {
      return initialState;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload)); // Ensure volume is between 0 and 1
    },
    play: (state) => {
      state.isPlaying = true;
    },
    pause: (state) => {
      state.isPlaying = false;
    },

    stop: (state) => {
      state.isPlaying = false;
    },
    setVoice: (state, action: PayloadAction<SpeechSynthesisVoice | null>) => {
      state.voice = action.payload;
    },
  },
});

export const {
  play,
  pause,
  stop,
  setVoice,
  setVolume,
  resetBrowserPlayer,
} = browserPlayerSlice.actions;

export default browserPlayerSlice.reducer;
