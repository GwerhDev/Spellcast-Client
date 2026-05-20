import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { soundBackgrounds } from '../config/assets/soundBackgrounds';
import { pageBackgrounds } from '../config/assets/pageBackgrounds';

const STATE_VERSION = 2;

const FREE_IDS = [
  ...soundBackgrounds.filter(a => a.unlockMethod === 'free').map(a => a.id),
  ...pageBackgrounds.filter(a => a.unlockMethod === 'free').map(a => a.id),
];

interface UserLibraryState {
  version: number;
  unlockedIds: string[];
  activeSoundBgId: string | null;
  activePageBgId: string | null;
  soundBgVolume: number;
  masterVolume: number;
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
  soundBgVolume: persisted.soundBgVolume ?? 0.35,
  masterVolume: persisted.masterVolume ?? 1,
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
    setSoundBgVolume(state, action: PayloadAction<number>) {
      state.soundBgVolume = Math.min(1, Math.max(0, action.payload));
    },
    setMasterVolume(state, action: PayloadAction<number>) {
      state.masterVolume = Math.min(1, Math.max(0, action.payload));
    },
  },
});

export const { unlockAsset, setActiveSoundBg, setActivePageBg, setSoundBgVolume, setMasterVolume } = userLibrarySlice.actions;
export default userLibrarySlice.reducer;
