import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { EditorSettingsPanel } from '../index';
import { setAutoSave } from '../../../../store/editorSlice';

describe('EditorSettingsPanel', () => {
  it('renders the panel', () => {
    renderWithProviders(<EditorSettingsPanel />);
    expect(screen.getByTestId('editor-settings-panel')).toBeInTheDocument();
  });

  it('shows autosave and manual save options', () => {
    renderWithProviders(<EditorSettingsPanel />);
    expect(screen.getByTestId('editor-settings-autosave')).toBeInTheDocument();
    expect(screen.getByTestId('editor-settings-manualsave')).toBeInTheDocument();
  });

  it('clicking autosave dispatches setAutoSave(true)', () => {
    const store = makeStore();
    renderWithProviders(<EditorSettingsPanel />, { store });
    fireEvent.click(screen.getByTestId('editor-settings-autosave'));
    expect(store.getState().editor.autoSave).toBe(true);
  });

  it('clicking manual save dispatches setAutoSave(false)', () => {
    const store = makeStore();
    store.dispatch(setAutoSave(true));
    renderWithProviders(<EditorSettingsPanel />, { store });
    fireEvent.click(screen.getByTestId('editor-settings-manualsave'));
    expect(store.getState().editor.autoSave).toBe(false);
  });

  it('clicking close dispatches setShowEditorSettings(false)', () => {
    const store = makeStore();
    renderWithProviders(<EditorSettingsPanel />, { store });
    fireEvent.click(screen.getByTestId('editor-settings-close'));
    expect(store.getState().editor.showEditorSettings).toBe(false);
  });
});
