import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getCredentials as getCredentialsService, updateCredential as updateCredentialService, setCurrentCredential as setCurrentCredentialService } from "../services/credentials";
import { TTS_Credential, Voice } from "../interfaces";
import type { RootState } from ".";

interface CredentialsState {
  credentials: TTS_Credential[];
  currentCredentialId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: CredentialsState = {
  credentials: [],
  currentCredentialId: null,
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

export const updateCurrentCredential = createAsyncThunk(
  "credentials/updateCurrent",
  async (credentialId: string | null) => {
    await setCurrentCredentialService(credentialId);
    return credentialId;
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
    setCurrentCredentialId: (state, action: PayloadAction<string | null>) => {
      state.currentCredentialId = action.payload;
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
      })
      .addCase(updateCurrentCredential.fulfilled, (state, action) => {
        state.currentCredentialId = action.payload;
      })
      .addCase(updateCurrentCredential.rejected, (state, action) => {
        state.error = action.error.message || "Failed to set current credential";
      });
  },
});

export const { updateSingleCredential, setCurrentCredentialId } = credentialsSlice.actions;

export const selectCurrentCredential = (state: RootState): TTS_Credential | null =>
  state.credentials.credentials.find(c => c.id === state.credentials.currentCredentialId) ?? null;

export default credentialsSlice.reducer;