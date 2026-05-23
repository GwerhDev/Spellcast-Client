import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { LanguageProvider } from '../i18n';
import pdfReaderReducer from '../store/pdfReaderSlice';
import pdfUploadReducer from '../store/pdfUploadSlice';
import browserPlayerReducer from '../store/browserPlayerSlice';
import audioPlayerReducer from '../store/audioPlayerSlice';
import sessionReducer from '../store/sessionSlice';
import voiceReducer from '../store/voiceSlice';
import userLibraryReducer from '../store/userLibrarySlice';
import editorReducer from '../store/editorSlice';
import credentialsReducer from '../store/credentialsSlice';
import groupsReducer from '../store/groupsSlice';
import documentReducer from '../store/documentSlice';
import apiResponsesReducer from '../store/apiResponsesSlice';

export const makeStore = () => configureStore({
  reducer: {
    pdfReader: pdfReaderReducer,
    pdfUpload: pdfUploadReducer,
    browserPlayer: browserPlayerReducer,
    audioPlayer: audioPlayerReducer,
    session: sessionReducer,
    voice: voiceReducer,
    userLibrary: userLibraryReducer,
    editor: editorReducer,
    credentials: credentialsReducer,
    groups: groupsReducer,
    document: documentReducer,
    apiResponses: apiResponsesReducer,
  },
});

interface Options extends Omit<RenderOptions, 'wrapper'> {
  store?: EnhancedStore;
  initialPath?: string;
}

export const renderWithProviders = (ui: React.ReactElement, options: Options = {}) => {
  const { store = makeStore(), initialPath = '/', ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </MemoryRouter>
    </Provider>
  );

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};
