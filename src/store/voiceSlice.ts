import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SelectedVoice, Voice } from 'src/interfaces';

interface VoiceState {
  selectedVoice: SelectedVoice;
  voices: Voice[];
}

const loadSelectedVoice = (): SelectedVoice => {
  try {
    const storedVoice = localStorage.getItem('default_browser_voice');
    if (storedVoice) {
      const parsedVoice = JSON.parse(storedVoice);
      // Basic validation to ensure it matches the SelectedVoice interface
      if (parsedVoice && typeof parsedVoice.value === 'string' && (parsedVoice.type === 'ia' || parsedVoice.type === 'browser')) {
        return parsedVoice;
      }
    }
  } catch (error) {
    console.error("Failed to parse stored voice from localStorage", error);
  }
  return { value: 'default', type: 'browser' }; // Fallback default
};

const initialState: VoiceState = {
  selectedVoice: loadSelectedVoice(),
  voices: [
    { label: 'Browser', value: 'browser', gender: 'Male' },
  ],
};

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
});

export const { setSelectedVoice } = voiceSlice.actions;
export default voiceSlice.reducer;
