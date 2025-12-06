import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getCredentials as getCredentialsService, updateCredential as updateCredentialService } from "../services/credentials";
import { TTS_Credential, Voice } from "../interfaces";

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

export const updateCredential = createAsyncThunk(
  "credentials/updateCredential",
  async ({ credentialId, data }: { credentialId: string | undefined, data: { azure_key?: string; region?: string; voices?: Voice[] } }) => {
    const response = await updateCredentialService(credentialId, data);
    return response;
  }
);

const credentialsSlice = createSlice({
  name: "credentials",
  initialState,
  reducers: {
    updateSingleCredential: (state, action: PayloadAction<TTS_Credential>) => {
      const updatedCredential = action.payload;
      const index = state.credentials.findIndex(cred => cred.id === updatedCredential.id);
      if (index !== -1) {
        state.credentials[index] = updatedCredential;
      }
    },
  },
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
      })
      .addCase(updateCredential.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCredential.fulfilled, (state, action) => {
        state.loading = false;
        state.credentials = action.payload.credentials;
      })
      .addCase(updateCredential.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update credential";
      });
  },
});

export const { updateSingleCredential } = credentialsSlice.actions;
export default credentialsSlice.reducer;