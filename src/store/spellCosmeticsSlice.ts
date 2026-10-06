import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getSpellCosmetics, setSpellCosmetic as storeSpellCosmetic, type SpellCosmeticKind, type SpellCosmetics } from '../db/spellCosmetics';

// Each spell's own picks of the caster's cosmetics (see db/spellCosmetics), as read so far:
// a spell's entry is there once its picks have been read. Resolved against the inventory's
// defaults where they're shown (see useSpellCosmetic).
interface SpellCosmeticsState {
  bySpell: Record<string, SpellCosmetics>;
}

const initialState: SpellCosmeticsState = { bySpell: {} };

export const loadSpellCosmetics = createAsyncThunk(
  'spellCosmetics/load',
  ({ spellId, userId }: { spellId: string; userId: string | undefined }) => getSpellCosmetics(spellId, userId),
);

// One pick for one spell: an asset id, null (none), or undefined (back to the default).
export const pickSpellCosmetic = createAsyncThunk(
  'spellCosmetics/pick',
  ({ spellId, userId, kind, assetId }: { spellId: string; userId: string | undefined; kind: SpellCosmeticKind; assetId: string | null | undefined }) =>
    storeSpellCosmetic(spellId, userId, kind, assetId),
);

const spellCosmeticsSlice = createSlice({
  name: 'spellCosmetics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadSpellCosmetics.fulfilled, (state, action) => {
        state.bySpell[action.meta.arg.spellId] = action.payload;
      })
      // Shown as picked right away; the stored picks replace it once written.
      .addCase(pickSpellCosmetic.pending, (state, action) => {
        const { spellId, kind, assetId } = action.meta.arg;
        const picks = { ...(state.bySpell[spellId] ?? {}) };
        if (assetId === undefined) delete picks[kind];
        else picks[kind] = assetId;
        state.bySpell[spellId] = picks;
      })
      .addCase(pickSpellCosmetic.fulfilled, (state, action) => {
        state.bySpell[action.meta.arg.spellId] = action.payload;
      });
  },
});

export default spellCosmeticsSlice.reducer;
