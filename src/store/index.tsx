import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './sessionSlice';
import apiResponsesReducer from './apiResponsesSlice';
import audioPlayerReducer from './audioPlayerSlice';
import browserPlayerReducer from './browserPlayerSlice';
import pdfReaderReducer from './pdfReaderSlice';
import documentReducer from './documentSlice';
import voiceReducer from './voiceSlice';
import credentialsReducer from './credentialsSlice';
import groupsReducer from './groupsSlice';

export const store = configureStore({
  reducer: {
    voice: voiceReducer,
    groups: groupsReducer,
    session: sessionReducer,
    document: documentReducer,
    pdfReader: pdfReaderReducer,
    credentials: credentialsReducer,
    audioPlayer: audioPlayerReducer,
    browserPlayer: browserPlayerReducer,
    apiResponses: apiResponsesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['pdfReader/loadPdf/fulfilled', 'browserPlayer/setVoice'],
        ignoredPaths: ['pdfReader.pdfDoc', 'browserPlayer.voice'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
