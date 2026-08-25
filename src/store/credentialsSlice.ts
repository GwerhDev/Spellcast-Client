import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getCredentials as getCredentialsService, updateCredential as updateCredentialService, setCurrentCredential as setCurrentCredentialService } from "../services/credentials";
import { TTS_Credential, Voice } from "../interfaces";
import type { RootState } from ".";

interface CredentialsState {
  credentials: TTS_Credential[];
  currentCredentialId: string | null;
  loading: boolean;
}

const initialState: CredentialsState = {
  credentials: [],
  currentCredentialId: null,
  loading: false,
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
      })
      .addCase(getCredentials.fulfilled, (state, action) => {
        state.loading = false;
        state.credentials = action.payload;
      })
      .addCase(getCredentials.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateCredential.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCredential.fulfilled, (state, action) => {
        state.loading = false;
        state.credentials = action.payload.credentials;
      })
      .addCase(updateCredential.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateCurrentCredential.fulfilled, (state, action) => {
        state.currentCredentialId = action.payload;
      });
  },
});

export const { updateSingleCredential, setCurrentCredentialId } = credentialsSlice.actions;

// The credential used to source AI voices / TTS. Prefer the explicitly active
// one, but fall back to the first available credential so the player keeps
// working when the user hasn't starred one yet (restores pre-TCORE-53 default).
export const selectCurrentCredential = (state: RootState): TTS_Credential | null => {
  const { credentials, currentCredentialId } = state.credentials;
  return credentials.find(c => c.id === currentCredentialId) ?? credentials[0] ?? null;
};

export default credentialsSlice.reducer;