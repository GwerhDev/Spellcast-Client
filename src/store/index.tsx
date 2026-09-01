import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './sessionSlice';
import apiResponsesReducer from './apiResponsesSlice';
import signalReducer from './signalSlice';
import audioPlayerReducer from './audioPlayerSlice';
import browserPlayerReducer from './browserPlayerSlice';
import spellReaderReducer from './spellReaderSlice';
import spellReducer from './spellSlice';
import voiceReducer from './voiceSlice';
import credentialsReducer from './credentialsSlice';
import groupsReducer from './groupsSlice';
import editorReducer from './editorSlice';
import casterInventoryReducer from './casterInventorySlice';
import spellUploadReducer from './spellUploadSlice';
import desktopReducer from './desktopSlice';
import layoutReducer from './layoutSlice';

export const store = configureStore({
  reducer: {
    desktop: desktopReducer,
    voice: voiceReducer,
    groups: groupsReducer,
    editor: editorReducer,
    session: sessionReducer,
    spell: spellReducer,
    spellReader: spellReaderReducer,
    credentials: credentialsReducer,
    audioPlayer: audioPlayerReducer,
    browserPlayer: browserPlayerReducer,
    apiResponses: apiResponsesReducer,
    signal: signalReducer,
    casterInventory: casterInventoryReducer,
    spellUpload: spellUploadReducer,
    layout: layoutReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // 'pdfReader/loadPdf/fulfilled' and 'pdfReader.pdfDoc' were dropped
        // here: no such action or field exists anywhere in the codebase --
        // orphaned config from an earlier version of this slice.
        ignoredActions: ['browserPlayer/setVoice'],
        ignoredPaths: ['browserPlayer.voice', 'spellUpload.queue'],
      },
    }),
});

// TCORE-108: writes to the renamed key 'casterInventory' -- the OLD 'userLibrary' key is
// deliberately left untouched (never deleted, never written to again) rather than migrated
// in place; casterInventorySlice.ts's own loadPersistedState() reads the old key as a
// one-time, non-destructive fallback when the new one doesn't exist yet, so an existing
// user's unlocked cosmetics/companion placements carry over on their first load after this
// change, and every write from then on lands under the new key.
store.subscribe(() => {
  try {
    localStorage.setItem('casterInventory', JSON.stringify(store.getState().casterInventory));
  } catch {}
});

store.subscribe(() => {
  try {
    localStorage.setItem('layout', JSON.stringify(store.getState().layout));
  } catch {}
});

// Single writer for the reader preference keys: ReaderSettings and
// AttentionGuardModal both dispatch to spellReader for these four fields
// (the modal offers the same toggle/interval controls mid-read, without
// opening the full settings panel), but previously ALSO both called
// localStorage.setItem for the same keys themselves -- two independent
// writers of the same state that happened to agree only because both
// copied the same logic by hand. Centralizing the write here means
// dispatch() alone is enough from either component.
store.subscribe(() => {
  try {
    const { fitToWidth, lightningMode, attentionGuardEnabled, attentionGuardInterval } = store.getState().spellReader;
    localStorage.setItem('reader:fitToWidth', String(fitToWidth));
    localStorage.setItem('reader:lightningMode', String(lightningMode));
    localStorage.setItem('reader:attentionGuard', String(attentionGuardEnabled));
    localStorage.setItem('reader:attentionGuardInterval', String(attentionGuardInterval));
  } catch {}
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
