import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BrowserPlayerState {
  text: string;
  sentences: string[];
  isPlaying: boolean;
  isPaused: boolean;
  currentSentenceIndex: number;
  voice: SpeechSynthesisVoice | null;
}

const initialState: BrowserPlayerState = {
  text: '',
  sentences: [],
  isPlaying: false,
  isPaused: false,
  currentSentenceIndex: -1, // Use -1 to indicate nothing is highlighted initially
  voice: null,
};

const browserPlayerSlice = createSlice({
  name: 'browserPlayer',
  initialState,
  reducers: {
    setText: (state, action: PayloadAction<string>) => {
      state.text = action.payload;
    },
    setSentencesAndPlay: (state, action: PayloadAction<{sentences: string[], text: string}>) => {
        state.sentences = action.payload.sentences;
        state.text = action.payload.text;
        state.isPlaying = true;
        state.isPaused = false;
        state.currentSentenceIndex = 0;
    },
    setCurrentSentenceIndex: (state, action: PayloadAction<number>) => {
        state.currentSentenceIndex = action.payload;
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
      state.sentences = [];
      state.currentSentenceIndex = -1;
    },
    setVoice: (state, action: PayloadAction<SpeechSynthesisVoice | null>) => {
      state.voice = action.payload;
    },
  },
});

export const {
  setText,
  setSentencesAndPlay,
  setCurrentSentenceIndex,
  play,
  pause,
  resume,
  stop,
  setVoice,
} = browserPlayerSlice.actions;

export default browserPlayerSlice.reducer;
