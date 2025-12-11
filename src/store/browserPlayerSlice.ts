import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BrowserPlayerState {
  text: string;
  isPlaying: boolean;
  isPaused: boolean;
  voice: SpeechSynthesisVoice | null;
}

const initialState: BrowserPlayerState = {
  text: '',
  isPlaying: false,
  isPaused: false,
  voice: null,
};

const browserPlayerSlice = createSlice({
  name: 'browserPlayer',
  initialState,
  reducers: {
    setText: (state, action: PayloadAction<string>) => {
      state.text = action.payload;
    },
    play: (state) => {
      state.isPlaying = true;
      state.isPaused = false;
    },
    pause: (state) => {
      state.isPaused = true;
    },
    resume: (state) => {
      state.isPaused = false;
    },
    stop: (state) => {
      state.isPlaying = false;
      state.isPaused = false;
      state.text = '';
    },
    setVoice: (state, action: PayloadAction<SpeechSynthesisVoice | null>) => {
      state.voice = action.payload;
    },
  },
});

export const {
  setText,
  play,
  pause,
  resume,
  stop,
  setVoice,
} = browserPlayerSlice.actions;

export default browserPlayerSlice.reducer;
