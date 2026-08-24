import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './sessionSlice';
import apiResponsesReducer from './apiResponsesSlice';
import signalReducer from './signalSlice';
import audioPlayerReducer from './audioPlayerSlice';
import browserPlayerReducer from './browserPlayerSlice';
import pdfReaderReducer from './pdfReaderSlice';
import spellReducer from './spellSlice';
import voiceReducer from './voiceSlice';
import credentialsReducer from './credentialsSlice';
import groupsReducer from './groupsSlice';
import editorReducer from './editorSlice';
import userLibraryReducer from './userLibrarySlice';
import pdfUploadReducer from './pdfUploadSlice';
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
    pdfReader: pdfReaderReducer,
    credentials: credentialsReducer,
    audioPlayer: audioPlayerReducer,
    browserPlayer: browserPlayerReducer,
    apiResponses: apiResponsesReducer,
    signal: signalReducer,
    userLibrary: userLibraryReducer,
    pdfUpload: pdfUploadReducer,
    layout: layoutReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['pdfReader/loadPdf/fulfilled', 'browserPlayer/setVoice'],
        ignoredPaths: ['pdfReader.pdfDoc', 'browserPlayer.voice', 'pdfUpload.queue'],
      },
    }),
});

store.subscribe(() => {
  try {
    localStorage.setItem('userLibrary', JSON.stringify(store.getState().userLibrary));
  } catch {}
});

store.subscribe(() => {
  try {
    localStorage.setItem('layout', JSON.stringify(store.getState().layout));
  } catch {}
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
