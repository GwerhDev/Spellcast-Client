import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Confirms to the end user that a hardware/OS signal (headset play/pause,
// media keys) actually reached the app -- distinct from apiResponsesSlice,
// which is for API call outcomes, not hardware signal confirmations (TCORE-81).
interface SignalNotice {
  id: string;
  message: string;
}

interface SignalState {
  notices: SignalNotice[];
}

const initialState: SignalState = {
  notices: [],
};

const signalSlice = createSlice({
  name: 'signal',
  initialState,
  reducers: {
    addSignalNotice: (state, action: PayloadAction<{ message: string }>) => {
      const notice: SignalNotice = {
        id: Date.now().toString(),
        ...action.payload,
      };
      state.notices.push(notice);
    },
    removeSignalNotice: (state, action: PayloadAction<string>) => {
      state.notices = state.notices.filter((notice) => notice.id !== action.payload);
    },
    clearSignalNotices: (state) => {
      state.notices = [];
    },
  },
});

export const { addSignalNotice, removeSignalNotice, clearSignalNotices } = signalSlice.actions;
export default signalSlice.reducer;
