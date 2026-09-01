import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore, combineReducers, EnhancedStore } from '@reduxjs/toolkit';
import { LanguageProvider } from '../i18n';
import spellReaderReducer from '../store/spellReaderSlice';
import spellUploadReducer from '../store/spellUploadSlice';
import browserPlayerReducer from '../store/browserPlayerSlice';
import audioPlayerReducer from '../store/audioPlayerSlice';
import sessionReducer from '../store/sessionSlice';
import voiceReducer from '../store/voiceSlice';
import casterInventoryReducer from '../store/casterInventorySlice';
import editorReducer from '../store/editorSlice';
import credentialsReducer from '../store/credentialsSlice';
import groupsReducer from '../store/groupsSlice';
import spellReducer from '../store/spellSlice';
import apiResponsesReducer from '../store/apiResponsesSlice';
import layoutReducer from '../store/layoutSlice';
import signalReducer from '../store/signalSlice';
import desktopReducer from '../store/desktopSlice';

const rootReducer = combineReducers({
  spellReader: spellReaderReducer,
  spellUpload: spellUploadReducer,
  browserPlayer: browserPlayerReducer,
  audioPlayer: audioPlayerReducer,
  session: sessionReducer,
  voice: voiceReducer,
  casterInventory: casterInventoryReducer,
  editor: editorReducer,
  credentials: credentialsReducer,
  groups: groupsReducer,
  spell: spellReducer,
  apiResponses: apiResponsesReducer,
  layout: layoutReducer,
  signal: signalReducer,
  desktop: desktopReducer,
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
  // preloadedState is destructured out here only to exclude it from renderOptions
  // (RTL's render() doesn't accept it) -- makeStore already consumed it above.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
