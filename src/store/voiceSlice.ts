import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SelectedVoice, Voice } from 'src/interfaces';
import { getVoicePreference } from '../db/preferences';

interface VoiceState {
  selectedVoice: SelectedVoice;
  voices: Voice[];
}

const initialState: VoiceState = {
  selectedVoice: { value: 'default', type: 'browser' },
  voices: [
    { name: 'Browser', value: 'browser', gender: 'Male' },
  ],
};

export const loadVoicePreference = createAsyncThunk(
  'voice/loadPreference',
  async (userId: string) => {
    const stored = await getVoicePreference(userId);
    return stored;
  }
);

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    setSelectedVoice: (state, action: PayloadAction<SelectedVoice>) => {
      state.selectedVoice = action.payload;
    },
    setVoices: (state, action: PayloadAction<Voice[]>) => {
      state.voices = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadVoicePreference.fulfilled, (state, action) => {
      if (action.payload) {
        state.selectedVoice = action.payload;
      }
    });
  },
});

export const { setSelectedVoice, setVoices } = voiceSlice.actions;
export default voiceSlice.reducer;
