import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore, combineReducers, EnhancedStore } from '@reduxjs/toolkit';
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
import spellReducer from '../store/spellSlice';
import apiResponsesReducer from '../store/apiResponsesSlice';
import layoutReducer from '../store/layoutSlice';

const rootReducer = combineReducers({
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
  spell: spellReducer,
  apiResponses: apiResponsesReducer,
  layout: layoutReducer,
});

type PreloadedState = Partial<ReturnType<typeof rootReducer>>;

export const makeStore = (preloadedState?: PreloadedState) =>
  configureStore({ reducer: rootReducer, preloadedState });

interface Options extends Omit<RenderOptions, 'wrapper'> {
  store?: EnhancedStore;
  initialPath?: string;
  preloadedState?: PreloadedState;
}

export const renderWithProviders = (ui: React.ReactElement, options: Options = {}) => {
  const { store = makeStore(options.preloadedState), initialPath = '/', preloadedState: _ps, ...renderOptions } = options;

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
