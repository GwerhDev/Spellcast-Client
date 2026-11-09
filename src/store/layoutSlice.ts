import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const STATE_VERSION = 1;

// TCORE-109: "storage" now lives inside "settings" as a flat item (like
// Credentials/Permissions/Appearance), not its own collapsible accordion -- no separate key
// needed for it. Same for "inventory": a flat item under "caster" again, not an accordion.
export type SidebarSectionKey = 'editor' | 'caster' | 'settings';

const DEFAULT_OPEN_SECTIONS: Record<SidebarSectionKey, boolean> = {
  editor: false,
  caster: false,
  settings: false,
};

// Where a page list (the pages beside the page) is: the reader's, and the editor's.
export type PageListPlace = 'reader' | 'editor';

interface LayoutState {
  version: number;
  sidebarCollapsed: boolean;
  sidebarOpenSections: Record<SidebarSectionKey, boolean>;
  // Whether each page list is shown (on a wide screen: on a phone it opens over the page,
  // and starts hidden), as the caster left it.
  pageListOpen: Record<PageListPlace, boolean>;
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
  pageListOpen: { reader: true, editor: true, ...(persisted.pageListOpen ?? {}) },
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
    setPageListOpen(state, action: PayloadAction<{ place: PageListPlace; open: boolean }>) {
      state.pageListOpen[action.payload.place] = action.payload.open;
    },
  },
});

export const { setSidebarCollapsed, toggleSidebarCollapsed, setSectionOpen, toggleSection, setPageListOpen } = layoutSlice.actions;
export default layoutSlice.reducer;
