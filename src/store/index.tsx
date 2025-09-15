import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './sessionSlice';
import apiResponsesReducer from './apiResponsesSlice';
import audioPlayerReducer from './audioPlayerSlice';
import pdfReaderReducer from './pdfReaderSlice';
import voiceReducer from './voiceSlice';
import credentialsReducer from './credentialsSlice';
import groupsReducer from './groupsSlice';

export const store = configureStore({
  reducer: {
    voice: voiceReducer,
    groups: groupsReducer,
    session: sessionReducer,
    pdfReader: pdfReaderReducer,
    credentials: credentialsReducer,
    audioPlayer: audioPlayerReducer,
    apiResponses: apiResponsesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['pdfReader/loadPdf/fulfilled'],
        ignoredPaths: ['pdfReader.pdfDoc'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
