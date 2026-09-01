import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const STATE_VERSION = 1;

export type SidebarSectionKey = 'editor' | 'caster' | 'storage' | 'settings';

const DEFAULT_OPEN_SECTIONS: Record<SidebarSectionKey, boolean> = {
  editor: false,
  caster: false,
  storage: false,
  settings: false,
};

interface LayoutState {
  version: number;
  sidebarCollapsed: boolean;
  sidebarOpenSections: Record<SidebarSectionKey, boolean>;
}

const loadPersistedState = (): Partial<LayoutState> => {
  try {
    const raw = localStorage.getItem('layout');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LayoutState>;
      if (parsed.version !== STATE_VERSION) {
        return {};
      }
      return parsed;
    }
  } catch {}
  return {};
};

const persisted = loadPersistedState();

const initialState: LayoutState = {
  version: STATE_VERSION,
  sidebarCollapsed: persisted.sidebarCollapsed ?? false,
  sidebarOpenSections: { ...DEFAULT_OPEN_SECTIONS, ...(persisted.sidebarOpenSections ?? {}) },
};

const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSectionOpen(state, action: PayloadAction<{ key: SidebarSectionKey; open: boolean }>) {
      state.sidebarOpenSections[action.payload.key] = action.payload.open;
    },
    toggleSection(state, action: PayloadAction<SidebarSectionKey>) {
      state.sidebarOpenSections[action.payload] = !state.sidebarOpenSections[action.payload];
    },
  },
});

export const { setSidebarCollapsed, toggleSidebarCollapsed, setSectionOpen, toggleSection } = layoutSlice.actions;
export default layoutSlice.reducer;
