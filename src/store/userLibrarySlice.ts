import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { soundBackgrounds } from '../config/assets/soundBackgrounds';
import { pageBackgrounds } from '../config/assets/pageBackgrounds';
import { companions } from '../config/assets/companions';

const STATE_VERSION = 4;

const MIN_COMPANION_SCALE = 0.4;
const MAX_COMPANION_SCALE = 2.5;

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
}

interface UserLibraryState {
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

const loadPersistedState = (): Partial<UserLibraryState> => {
  try {
    const raw = localStorage.getItem('userLibrary');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserLibraryState>;
      if (parsed.version !== STATE_VERSION) {
        return { ...parsed, unlockedIds: FREE_IDS, version: STATE_VERSION };
      }
      return parsed;
    }
  } catch {}
  return {};
};

const persisted = loadPersistedState();

const initialState: UserLibraryState = {
  version: STATE_VERSION,
  unlockedIds: persisted.unlockedIds ?? FREE_IDS,
  activeSoundBgId: persisted.activeSoundBgId ?? null,
  activePageBgId: persisted.activePageBgId ?? 'default',
  activeCompanionId: persisted.activeCompanionId ?? null,
  soundBgVolume: persisted.soundBgVolume ?? 0.35,
  masterVolume: persisted.masterVolume ?? 1,
  companionPlacements: persisted.companionPlacements ?? {},
};

const userLibrarySlice = createSlice({
  name: 'userLibrary',
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
} = userLibrarySlice.actions;
export default userLibrarySlice.reducer;
