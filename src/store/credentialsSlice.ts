import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getCredentials as getCredentialsService } from "../services/credentials";
import { TTS_Credential } from "../interfaces";

interface CredentialsState {
  credentials: TTS_Credential[];
  loading: boolean;
  error: string | null;
}

const initialState: CredentialsState = {
  credentials: [],
  loading: false,
  error: null,
};

export const getCredentials = createAsyncThunk(
  "credentials/getCredentials",
  async () => {
    const response = await getCredentialsService();
    return response;
  }
);

const credentialsSlice = createSlice({
  name: "credentials",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getCredentials.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCredentials.fulfilled, (state, action) => {
        state.loading = false;
        state.credentials = action.payload;
      })
      .addCase(getCredentials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch credentials";
      });
  },
});

export default credentialsSlice.reducer;