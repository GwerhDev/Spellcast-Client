import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Session } from '../interfaces';
import { ACCOUNT_BASE, CLIENT_BASE } from '../config/api';

const initialState: Session = { logged: false, userData: { loader: true } };

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setSession: (_, action: PayloadAction<Session>) => action.payload,
    clearSession: () => (window.location.href = `${ACCOUNT_BASE}/login?callback=${encodeURIComponent(CLIENT_BASE)}`, { logged: false, userData: { loader: true } }),
    setLoader: (state, action: PayloadAction<boolean>) => {
      state.userData.loader = action.payload;
    },
  },
});

export const { setSession, clearSession, setLoader } = sessionSlice.actions;
export default sessionSlice.reducer;
