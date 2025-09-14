import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './sessionSlice';
import apiResponsesReducer from './apiResponsesSlice';
import audioPlayerReducer from './audioPlayerSlice';
import pdfReaderReducer from './pdfReaderSlice';
import voiceReducer from './voiceSlice';
import credentialsReducer from './credentialsSlice';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    credentials: credentialsReducer,
    apiResponses: apiResponsesReducer,
    audioPlayer: audioPlayerReducer,
    pdfReader: pdfReaderReducer,
    voice: voiceReducer,
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
