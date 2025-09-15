import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getGroups as getGroupsService } from "../services/groups";
import { Group } from "../interfaces";

interface GroupsState {
  groups: Group[];
  loading: boolean;
  error: string | null;
}

const initialState: GroupsState = {
  groups: [],
  loading: false,
  error: null,
};

export const getGroups = createAsyncThunk(
  "groups/getGroups",
  async () => {
    const response = await getGroupsService();
    return response;
  }
);

const groupsSlice = createSlice({
  name: "groups",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
      })
      .addCase(getGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch credentials";
      });
  },
});

export default groupsSlice.reducer;