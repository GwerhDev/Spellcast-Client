import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// What the home page shows behind the altar while a spell is conjured on it: nothing (the
// plain page), or the spell's cover filling the page.
export type AltarBackdrop = 'none' | 'cover';

// The quick start under the altar: filters that combine (all of them apply at once).
// 'last' puts the latest first (and only the latest few); 'inProgress' keeps the spells
// being read (a page past the first reached); 'favorites' isn't there yet (can't be on).
export type QuickStartFilter = 'last' | 'inProgress' | 'favorites';

export const ALTAR_BACKDROP_KEY = 'altar:backdrop';
export const ALTAR_QUICK_START_KEY = 'altar:quickStart';
export const ALTAR_READ_ON_CONJURE_KEY = 'altar:readOnConjure';
// Before the quick start's filters combined, the row had one list: read once, to carry it.
const LEGACY_HOME_LIST_KEY = 'altar:homeList';

const SELECTABLE: QuickStartFilter[] = ['last', 'inProgress'];

// localStorage can throw (private browsing, storage blocked): these reads run at module
// init, so an unguarded one would take the whole app down on load.
const readPref = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};

const readQuickStart = (): QuickStartFilter[] => {
  const stored = readPref(ALTAR_QUICK_START_KEY);
  if (stored !== null) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return SELECTABLE.filter(f => parsed.includes(f));
    } catch { /* not a list: the default below */ }
  }
  // The single list it was: "in progress" was the latest of those being read.
  if (readPref(LEGACY_HOME_LIST_KEY) === 'inProgress') return ['last', 'inProgress'];
  return ['last'];
};

interface AltarState {
  backdrop: AltarBackdrop;
  quickStart: QuickStartFilter[];
  // Conjuring a spell (dropping it on the altar) starts reading it; off, it's conjured
  // paused, ready to read.
  readOnConjure: boolean;
}

const initialState: AltarState = {
  backdrop: readPref(ALTAR_BACKDROP_KEY) === 'cover' ? 'cover' : 'none',
  quickStart: readQuickStart(),
  readOnConjure: readPref(ALTAR_READ_ON_CONJURE_KEY) !== 'false',
};

const altarSlice = createSlice({
  name: 'altar',
  initialState,
  reducers: {
    setAltarBackdrop: (state, action: PayloadAction<AltarBackdrop>) => {
      state.backdrop = action.payload;
    },
    // On or off, one filter of the quick start (in their own order; one not there yet is
    // left alone).
    toggleQuickStartFilter: (state, action: PayloadAction<QuickStartFilter>) => {
      const filter = action.payload;
      if (!SELECTABLE.includes(filter)) return;
      const on = state.quickStart.includes(filter);
      state.quickStart = SELECTABLE.filter(f => (f === filter ? !on : state.quickStart.includes(f)));
    },
    setReadOnConjure: (state, action: PayloadAction<boolean>) => {
      state.readOnConjure = action.payload;
    },
  },
});

export const { setAltarBackdrop, toggleQuickStartFilter, setReadOnConjure } = altarSlice.actions;
export default altarSlice.reducer;
