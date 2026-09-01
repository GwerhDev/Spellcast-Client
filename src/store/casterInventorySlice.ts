import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { soundBackgrounds } from '../config/assets/soundBackgrounds';
import { pageBackgrounds } from '../config/assets/pageBackgrounds';
import { companions } from '../config/assets/companions';

// Bumped to 5: companionPlacements' coordinate system changed shape across this session's
// CompanionOverlay redesigns (shared-canvas world units -> per-model canvas pixels), so a
// placement saved under an older layout can point a cat's hit box and its visible canvas
// at two different spots, or off in a stale direction entirely -- not safely correctable
// field-by-field like the inFront default below, so a version bump drops old placements
// outright instead of trying to migrate coordinates that no longer mean the same thing.
const STATE_VERSION = 5;

// Exported so CompanionOverlay can predict a scale change's clamped result itself (to
// re-clamp the model's on-screen position immediately, before this reducer's own update
// round-trips back through Redux) instead of duplicating these numbers.
export const MIN_COMPANION_SCALE = 0.4;
export const MAX_COMPANION_SCALE = 2.5;

const FREE_IDS = [
  ...soundBackgrounds.filter(a => a.unlockMethod === 'free').map(a => a.id),
  ...pageBackgrounds.filter(a => a.unlockMethod === 'free').map(a => a.id),
  // requiresExplicitUnlock companions (e.g. the gift-announcement cats) are deliberately
  // excluded here even once !comingSoon — see that field's comment in config/assets/types.
  ...companions.filter(a => a.unlockMethod === 'free' && !a.comingSoon && !a.requiresExplicitUnlock).map(a => a.id),
];

export interface CompanionPlacement {
  x: number;
  y: number;
  rotationX: number;
  rotationY: number;
  scale: number;
  // Real depth relative to the reader's paper sheet, not a CSS stacking hack: the paper
  // is rendered as a drei <Html> node inside the same three.js scene as the cats, so
  // whichever one has the smaller camera distance actually occludes the other. true
  // (default) keeps the cat walking on top of the page, like a desktop pet; false sends
  // it behind the sheet. Toggled per-model via Ctrl+Shift+click on its hit box.
  inFront: boolean;
}

interface CasterInventoryState {
  version: number;
  unlockedIds: string[];
  activeSoundBgId: string | null;
  activePageBgId: string | null;
  activeCompanionId: string | null;
  soundBgVolume: number;
  masterVolume: number;
  // Keyed by companion model id (e.g. 'orange', 'black'), not companion id — each model
  // instance keeps its own position/rotation/scale in the reader.
  companionPlacements: Record<string, CompanionPlacement>;
}

// TCORE-108: renamed from userLibrarySlice (its "Library" was never the spell grimoire --
// that's the IndexedDB 'spells' store / backend Grimoire model, TCORE-104 -- it's always
// been the Caster's own cosmetics/unlockables + volumes). The localStorage key is renamed
// to match ('userLibrary' -> 'casterInventory'), but non-destructively: this reads the new
// key first, and only falls back to the OLD key if the new one hasn't been written yet, so
// an existing user's unlockedIds/companionPlacements load exactly as before on their first
// visit after this change. The OLD key is deliberately never deleted here (store/index.tsx
// simply stops writing to it) -- an orphaned, unread key is harmless; actively clearing it
// right after a read is not, if the very next write somehow failed for any reason.
const loadPersistedState = (): Partial<CasterInventoryState> => {
  try {
    const raw = localStorage.getItem('casterInventory') ?? localStorage.getItem('userLibrary');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CasterInventoryState>;
      if (parsed.version !== STATE_VERSION) {
        // companionPlacements dropped too -- see the STATE_VERSION comment above.
        return { ...parsed, unlockedIds: FREE_IDS, companionPlacements: {}, version: STATE_VERSION };
      }
      return parsed;
    }
  } catch {}
  return {};
};

const persisted = loadPersistedState();

// Placements saved before `inFront` existed lack the field entirely -- default them to
// true (in front of the page, the pre-existing visual behavior) instead of leaving it
// undefined, which would silently break the `!current.inFront` toggle and the Z placement
// in the scene.
const sanitizePlacements = (placements: Record<string, CompanionPlacement> | undefined): Record<string, CompanionPlacement> => {
  if (!placements) return {};
  return Object.fromEntries(
    Object.entries(placements).map(([key, p]) => [key, { ...p, inFront: p.inFront ?? true }])
  );
};

const initialState: CasterInventoryState = {
  version: STATE_VERSION,
  unlockedIds: persisted.unlockedIds ?? FREE_IDS,
  activeSoundBgId: persisted.activeSoundBgId ?? null,
  activePageBgId: persisted.activePageBgId ?? 'default',
  activeCompanionId: persisted.activeCompanionId ?? null,
  soundBgVolume: persisted.soundBgVolume ?? 0.35,
  masterVolume: persisted.masterVolume ?? 1,
  companionPlacements: sanitizePlacements(persisted.companionPlacements),
};

const casterInventorySlice = createSlice({
  name: 'casterInventory',
  initialState,
  reducers: {
    unlockAsset(state, action: PayloadAction<string>) {
      if (!state.unlockedIds.includes(action.payload)) {
        state.unlockedIds.push(action.payload);
      }
    },
    setActiveSoundBg(state, action: PayloadAction<string | null>) {
      state.activeSoundBgId = action.payload;
    },
    setActivePageBg(state, action: PayloadAction<string | null>) {
      state.activePageBgId = action.payload;
    },
    setActiveCompanion(state, action: PayloadAction<string | null>) {
      state.activeCompanionId = action.payload;
    },
    setSoundBgVolume(state, action: PayloadAction<number>) {
      state.soundBgVolume = Math.min(1, Math.max(0, action.payload));
    },
    setMasterVolume(state, action: PayloadAction<number>) {
      state.masterVolume = Math.min(1, Math.max(0, action.payload));
    },
    moveCompanionModel(state, action: PayloadAction<{ key: string; dx: number; dy: number; base: CompanionPlacement }>) {
      const { key, dx, dy, base } = action.payload;
      const current = state.companionPlacements[key] ?? base;
      state.companionPlacements[key] = { ...current, x: current.x + dx, y: current.y + dy };
    },
    rotateCompanionModel(state, action: PayloadAction<{ key: string; dRotationX: number; dRotationY: number; base: CompanionPlacement }>) {
      const { key, dRotationX, dRotationY, base } = action.payload;
      const current = state.companionPlacements[key] ?? base;
      state.companionPlacements[key] = {
        ...current,
        rotationX: current.rotationX + dRotationX,
        rotationY: current.rotationY + dRotationY,
      };
    },
    scaleCompanionModel(state, action: PayloadAction<{ key: string; dScale: number; base: CompanionPlacement }>) {
      const { key, dScale, base } = action.payload;
      const current = state.companionPlacements[key] ?? base;
      const nextScale = Math.min(MAX_COMPANION_SCALE, Math.max(MIN_COMPANION_SCALE, current.scale + dScale));
      state.companionPlacements[key] = { ...current, scale: nextScale };
    },
    toggleCompanionDepth(state, action: PayloadAction<{ key: string; base: CompanionPlacement }>) {
      const { key, base } = action.payload;
      const current = state.companionPlacements[key] ?? base;
      state.companionPlacements[key] = { ...current, inFront: !current.inFront };
    },
  },
});

export const {
  unlockAsset,
  setActiveSoundBg,
  setActivePageBg,
  setActiveCompanion,
  setSoundBgVolume,
  setMasterVolume,
  moveCompanionModel,
  rotateCompanionModel,
  scaleCompanionModel,
  toggleCompanionDepth,
} = casterInventorySlice.actions;
export default casterInventorySlice.reducer;
