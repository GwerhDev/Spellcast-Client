import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface VoiceState {
  selectedVoice: string;
  voices: { name: string; value: string }[];
}

const initialState: VoiceState = {
  selectedVoice: 'es-CL-LorenzoNeural', // Default voice
  voices: [
    { name: 'Lorenzo (Spanish Chile, Male)', value: 'es-CL-LorenzoNeural' },
    { name: 'Catalina (Spanish Chile, Female)', value: 'es-CL-CatalinaNeural' },
    { name: 'Aria (English US, Female)', value: 'en-US-AriaNeural' },
    { name: 'Guy (English US, Male)', value: 'en-US-GuyNeural' },
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
