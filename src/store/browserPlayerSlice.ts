import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BrowserPlayerState {
  isPlaying: boolean;
  voice: SpeechSynthesisVoice | null;
  volume: number;
  autoPlayOnLoad: boolean;
  toggleSeq: number;
  resumeSeq: number;
  externalPauseSeq: number;
}

const initialState: BrowserPlayerState = {
  isPlaying: false,
  voice: null,
  volume: 1,
  autoPlayOnLoad: false,
  toggleSeq: 0,
  resumeSeq: 0,
  externalPauseSeq: 0,
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
    requestTogglePlay: (state) => {
      state.toggleSeq += 1;
    },
    requestResume: (state) => {
      state.resumeSeq += 1;
      state.isPlaying = true;
    },
    // For callers outside BrowserPlayer (e.g. the attention guard's
    // inactivity timeout) that need to pause playback without touching
    // speechSynthesis themselves. BrowserPlayer's single event queue is the
    // only thing allowed to call speechSynthesis.pause() -- this seq counter
    // is what tells it a pause was requested externally, exactly like
    // toggleSeq/resumeSeq already do for the other external callers.
    requestExternalPause: (state) => {
      state.externalPauseSeq += 1;
      state.isPlaying = false;
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
  requestExternalPause,
  requestTogglePlay,
  requestResume,
} = browserPlayerSlice.actions;

export default browserPlayerSlice.reducer;
