import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AudioPlayerState {
  playlist: string[];
  currentTrackIndex: number | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  sourceType: 'playlist' | 'pdfPage';
}

const initialState: AudioPlayerState = {
  playlist: [],
  currentTrackIndex: null,
  isPlaying: false,
  volume: 1, // 0 to 1
  currentTime: 0,
  duration: 0,
  sourceType: 'playlist',
};

const audioPlayerSlice = createSlice({
  name: 'audioPlayer',
  initialState,
  reducers: {
    setPlaylist: (state, action: PayloadAction<{ playlist: string[], startIndex?: number, sourceType?: 'playlist' | 'pdfPage', pdfPageNumber?: number }>) => {
      state.playlist = action.payload.playlist;
      state.currentTrackIndex = action.payload.startIndex !== undefined ? action.payload.startIndex : (action.payload.playlist.length > 0 ? 0 : null);
      state.isPlaying = false;
      state.currentTime = 0;
      state.duration = 0;
      state.sourceType = action.payload.sourceType || 'playlist';
    },
    play: (state) => {
      state.isPlaying = true;
    },
    pause: (state) => {
      state.isPlaying = false;
    },
    stop: (state) => {
      state.isPlaying = false;
      state.currentTime = 0;
      // Optionally, you might want to reset currentTrackIndex to null or keep it
      // state.currentTrackIndex = null;
    },
    togglePlayPause: (state) => {
      state.isPlaying = !state.isPlaying;
    },
    playNext: (state) => {
      if (state.currentTrackIndex !== null && state.playlist.length > 0) {
        const nextIndex = state.currentTrackIndex + 1;
        if (nextIndex < state.playlist.length) {
          state.currentTrackIndex = nextIndex;
          state.isPlaying = true; // Auto-play next track
          state.currentTime = 0;
        } else {
          // End of playlist, stop or loop
          state.isPlaying = false;
          state.currentTime = 0;
          // state.currentTrackIndex = null; // Or loop to 0: state.currentTrackIndex = 0;
        }
      }
    },
    playPrevious: (state) => {
      if (state.currentTrackIndex !== null && state.playlist.length > 0) {
        const prevIndex = state.currentTrackIndex - 1;
        if (prevIndex >= 0) {
          state.currentTrackIndex = prevIndex;
          state.isPlaying = true; // Auto-play previous track
          state.currentTime = 0;
        } else {
          // Beginning of playlist, stop or loop
          state.isPlaying = false;
          state.currentTime = 0;
          // state.currentTrackIndex = state.playlist.length - 1; // Or loop to end
        }
      }
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload)); // Ensure volume is between 0 and 1
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    resetAudioPlayer: (state) => {
      state.playlist = [];
      state.currentTrackIndex = null;
      state.isPlaying = false;
      state.volume = 1;
      state.currentTime = 0;
      state.duration = 0;
    },
  },
});

export const {
  setPlaylist,
  play,
  pause,
  stop,
  togglePlayPause,
  playNext,
  playPrevious,
  setVolume,
  setCurrentTime,
  setDuration,
  resetAudioPlayer,
} = audioPlayerSlice.actions;

export default audioPlayerSlice.reducer;