import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SpellProgress } from '../interfaces';

interface SpellReaderState {
  spellId: string | null;
  spellTitle: string | null;
  totalPages: number;
  currentPage: number;
  isLoaded: boolean;
  hasInitialPageSet: boolean;
  showSearcher: boolean;
  currentPageText: string;
  progress?: SpellProgress; // Add progress to state
  currentSentenceIndex: number;
  sentences: string[];
  showReaderSettings: boolean;
  fitToWidth: boolean;
  lightningMode: boolean;
  attentionGuardEnabled: boolean;
  attentionGuardInterval: number;
  showAttentionGuard: boolean;
  activitySeq: number;
  contentVersion: number;
  listVersion: number;
}

const initialState: SpellReaderState = {
  spellId: null,
  spellTitle: null,
  totalPages: 1,
  currentPage: 1,
  isLoaded: false,
  sentences: [],
  currentSentenceIndex: -1, // Use -1 to indicate nothing is highlighted initially
  currentPageText: "",
  hasInitialPageSet: false, // Initialize new flag
  showSearcher: false,
  showReaderSettings: false,
  fitToWidth: localStorage.getItem('reader:fitToWidth') !== 'false',
  lightningMode: localStorage.getItem('reader:lightningMode') !== 'false',
  attentionGuardEnabled: localStorage.getItem('reader:attentionGuard') !== 'false',
  attentionGuardInterval: Number(localStorage.getItem('reader:attentionGuardInterval') ?? '15') || 15,
  showAttentionGuard: false,
  activitySeq: 0,
  contentVersion: 0,
  listVersion: 0,
  progress: {
    currentPage: 1,
    pagesProgress: [],
    lastReadSentenceIndex: 0,
  } // Initialize progress
};

const spellReaderSlice = createSlice({
  name: 'spellReader',
  initialState,
  reducers: {
    setSpellFile(state, action: PayloadAction<{ id: string, title: string, progress?: SpellProgress }>) {
      state.spellId = action.payload.id;
      state.spellTitle = action.payload.title;
      state.progress = action.payload.progress;
      if (action.payload.progress) {
        state.currentPage = action.payload.progress.currentPage || 1;
        state.currentSentenceIndex = action.payload.progress.lastReadSentenceIndex || 0;
      } else {
        // Without progress (a freshly-imported spell with no reading history yet),
        // currentSentenceIndex would otherwise stay at initialState's -1 (this
        // reducer only wrote it inside the `if` above). BrowserPlayer's sentence
        // effect requires currentSentenceIndex > -1 before it will ever call
        // speakSentence(), so a spell with no progress silently never spoke a word
        // when played from a list card (TCORE-81).
        state.currentPage = 1;
        state.currentSentenceIndex = 0;
      }
    },
    setSentences: (state, action: PayloadAction<{ sentences: string[], startIndex?: number }>) => {
      state.sentences = action.payload.sentences;
    },
    setCurrentSentenceIndex: (state, action: PayloadAction<number>) => {
      state.currentSentenceIndex = action.payload;
    },
    setSpellLoaded(state, action: PayloadAction<boolean>) {
      state.isLoaded = action.payload;
    },
    setSpellInfo(state, action: PayloadAction<{ totalPages: number }>) {
      state.totalPages = action.payload.totalPages;
    },
    setShowSearcher(state, action: PayloadAction<boolean>) {
      state.showSearcher = action.payload;
    },
    goToNextPage(state) {
      if (state.currentPage < state.totalPages) {
        state.currentPage += 1;
        state.currentSentenceIndex = 0;
      }
    },
    goToPreviousPage(state) {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
        state.currentSentenceIndex = 0;
      }
    },
    goToPage(state, action: PayloadAction<number>) {
      if (state.currentPage === action.payload) return;
      state.currentPage = action.payload;
      state.currentSentenceIndex = state.progress?.currentPage === action.payload ? state.progress.lastReadSentenceIndex : 0;
    },
    resetSpellReader() {
      return initialState;
    },
    setPageText(state, action: PayloadAction<{ text: string }>) {
      state.currentPageText = action.payload.text;
    },
    setHasInitialPageSet(state, action: PayloadAction<boolean>) { // New action
      state.hasInitialPageSet = action.payload;
    },
    setShowReaderSettings(state, action: PayloadAction<boolean>) {
      state.showReaderSettings = action.payload;
    },
    setFitToWidth(state, action: PayloadAction<boolean>) {
      state.fitToWidth = action.payload;
    },
    setLightningMode(state, action: PayloadAction<boolean>) {
      state.lightningMode = action.payload;
    },
    setAttentionGuardEnabled(state, action: PayloadAction<boolean>) {
      state.attentionGuardEnabled = action.payload;
    },
    setAttentionGuardInterval(state, action: PayloadAction<number>) {
      state.attentionGuardInterval = action.payload;
    },
    setShowAttentionGuard(state, action: PayloadAction<boolean>) {
      state.showAttentionGuard = action.payload;
    },
    recordReaderActivity(state) {
      state.activitySeq += 1;
    },
    invalidateContent(state) {
      state.contentVersion += 1;
    },
    invalidateSpellList(state) {
      state.listVersion += 1;
    },
  },
});

export const {
  setSpellFile,
  setSpellInfo,
  goToNextPage,
  goToPreviousPage,
  goToPage,
  resetSpellReader,
  setPageText,
  setSpellLoaded,
  setHasInitialPageSet,
  setShowSearcher,
  setSentences,
  setCurrentSentenceIndex,
  setShowReaderSettings,
  setFitToWidth,
  setLightningMode,
  setAttentionGuardEnabled,
  setAttentionGuardInterval,
  setShowAttentionGuard,
  recordReaderActivity,
  invalidateContent,
  invalidateSpellList,
} = spellReaderSlice.actions;

export default spellReaderSlice.reducer;
