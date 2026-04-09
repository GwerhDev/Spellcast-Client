import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BrowserPlayerState {
  isPlaying: boolean;
  voice: SpeechSynthesisVoice | null;
  volume: number;
  autoPlayOnLoad: boolean;
}

const initialState: BrowserPlayerState = {
  isPlaying: false,
  voice: null,
  volume: 1,
  autoPlayOnLoad: false,
};

const browserPlayerSlice = createSlice({
  name: 'browserPlayer',
  initialState,
  reducers: {
    resetBrowserPlayer: (state) => {
      return { ...initialState, autoPlayOnLoad: state.autoPlayOnLoad };
    },
    setAutoPlayOnLoad: (state, action: PayloadAction<boolean>) => {
      state.autoPlayOnLoad = action.payload;
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
  setAutoPlayOnLoad,
} = browserPlayerSlice.actions;

export default browserPlayerSlice.reducer;
