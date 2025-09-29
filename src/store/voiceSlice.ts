import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Voice } from 'src/interfaces';

interface VoiceState {
  selectedVoice: string;
  voices: Voice[];
}

const initialState: VoiceState = {
  selectedVoice: 'es-CL-LorenzoNeural', // Default voice
  voices: [
    { label: 'Lorenzo (Spanish Chile, Male)', value: 'es-CL-LorenzoNeural', gender: 'Male' },
    { label: 'Catalina (Spanish Chile, Female)', value: 'es-CL-CatalinaNeural', gender: 'Female' },
    { label: 'Aria (English US, Female)', value: 'en-US-AriaNeural', gender: 'Female' },
    { label: 'Guy (English US, Male)', value: 'en-US-GuyNeural', gender: 'Male' },
  ],
};

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    setSelectedVoice: (state, action: PayloadAction<string>) => {
      state.selectedVoice = action.payload;
    },
  },
});

export const { setSelectedVoice } = voiceSlice.actions;
export default voiceSlice.reducer;
