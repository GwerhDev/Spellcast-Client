import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BrowserPlayerState {
  sentences: string[];
  isPlaying: boolean;
  currentSentenceIndex: number;
  voice: SpeechSynthesisVoice | null;
  volume: number;
}

const initialState: BrowserPlayerState = {
  sentences: [],
  isPlaying: false,
  currentSentenceIndex: -1, // Use -1 to indicate nothing is highlighted initially
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
    setSentences: (state, action: PayloadAction<{ sentences: string[], startIndex?: number }>) => {
      state.sentences = action.payload.sentences;
      state.currentSentenceIndex = action.payload.startIndex || 0;
    },
    setCurrentSentenceIndex: (state, action: PayloadAction<number>) => {
      state.currentSentenceIndex = action.payload;
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
    resume: (state) => {
      state.isPlaying = true;
    },
    stop: (state) => {
      state.isPlaying = false;
      state.currentSentenceIndex = -1;
    },
    setVoice: (state, action: PayloadAction<SpeechSynthesisVoice | null>) => {
      state.voice = action.payload;
    },
  },
});

export const {
  setSentences,
  setCurrentSentenceIndex,
  play,
  pause,
  resume,
  stop,
  setVoice,
  setVolume,
  resetBrowserPlayer,
} = browserPlayerSlice.actions;

export default browserPlayerSlice.reducer;
