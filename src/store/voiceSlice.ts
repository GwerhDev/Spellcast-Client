import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Voice } from 'src/interfaces';

interface VoiceState {
  selectedVoice: string;
  voices: Voice[];
}

const initialState: VoiceState = {
  selectedVoice: 'browser', // Default voice
  voices: [
    { label: 'Browser', value: 'browser', gender: 'Male' },
  ],
};

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    setSelectedVoice: (state, action: PayloadAction<string>) => {
      state.selectedVoice = action.payload;
    },
    setVoices: (state, action: PayloadAction<Voice[]>) => {
      state.voices = action.payload;
    },
  },
});

export const { setSelectedVoice } = voiceSlice.actions;
export default voiceSlice.reducer;
