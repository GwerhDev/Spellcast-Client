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

// Where something is on screen (px, the viewport's).
export interface ScreenRect { left: number; top: number; width: number; height: number }

// A spell arriving at the altar, from where it was on screen: dropped on it (it melts into
// the altar from where it was let go) or conjured some other way (its card flies from its
// place in the quick start to the altar). Gone once it has landed.
export interface AltarArrival {
  spellId: string;
  via: 'drop' | 'flight';
  from: ScreenRect;
}

// A spell dispelled, going back from the altar to its card in the quick start: its cover
// leaves the altar's center (`from`) for where its card is (`to`, once the row has it back,
// with the card's own cover: the altar's goes with the spell); its card shows again once it
// has arrived.
export interface AltarDeparture {
  spellId: string;
  from: ScreenRect;
  to: ScreenRect | null;
  coverUrl: string | null;
}

interface AltarState {
  backdrop: AltarBackdrop;
  quickStart: QuickStartFilter[];
  // Conjuring a spell (dropping it on the altar) starts reading it; off, it's conjured
  // paused, ready to read.
  readOnConjure: boolean;
  arrival: AltarArrival | null;
  departure: AltarDeparture | null;
}

const initialState: AltarState = {
  backdrop: readPref(ALTAR_BACKDROP_KEY) === 'cover' ? 'cover' : 'none',
  quickStart: readQuickStart(),
  readOnConjure: readPref(ALTAR_READ_ON_CONJURE_KEY) !== 'false',
  arrival: null,
  departure: null,
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
    spellArriving: (state, action: PayloadAction<AltarArrival>) => {
      state.arrival = action.payload;
    },
    // It landed (or its way there was cut short): nothing arriving anymore.
    spellLanded: (state) => {
      state.arrival = null;
    },
    spellDeparting: (state, action: PayloadAction<{ spellId: string; from: ScreenRect }>) => {
      state.departure = { ...action.payload, to: null, coverUrl: null };
    },
    // Where its card is back, and its cover, for it to fly there.
    departureTargeted: (state, action: PayloadAction<{ to: ScreenRect; coverUrl: string | null }>) => {
      if (!state.departure) return;
      state.departure.to = action.payload.to;
      state.departure.coverUrl = action.payload.coverUrl;
    },
    // Back at its card (or with nowhere to go): its card shows again.
    spellReturned: (state) => {
      state.departure = null;
    },
  },
});

export const {
  setAltarBackdrop, toggleQuickStartFilter, setReadOnConjure, spellArriving, spellLanded, spellDeparting, departureTargeted, spellReturned,
} = altarSlice.actions;
export default altarSlice.reducer;
