import { describe, it, expect, vi, beforeEach } from 'vitest';
import reducer, { setShowEditorSettings, setAutoSave } from '../editorSlice';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  });
});

const initial = { showEditorSettings: false, autoSave: false };

describe('editorSlice', () => {
  it('returns initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.showEditorSettings).toBe(false);
  });

  it('setShowEditorSettings sets the flag', () => {
    expect(reducer(initial, setShowEditorSettings(true)).showEditorSettings).toBe(true);
    expect(reducer({ ...initial, showEditorSettings: true }, setShowEditorSettings(false)).showEditorSettings).toBe(false);
  });

  it('setAutoSave sets the flag', () => {
    expect(reducer(initial, setAutoSave(true)).autoSave).toBe(true);
    expect(reducer({ ...initial, autoSave: true }, setAutoSave(false)).autoSave).toBe(false);
  });
});
