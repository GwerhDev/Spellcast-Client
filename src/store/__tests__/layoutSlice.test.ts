import { describe, it, expect, vi, beforeEach } from 'vitest';
import reducer, {
  setSidebarCollapsed,
  toggleSidebarCollapsed,
  setSectionOpen,
  toggleSection,
  setPageListOpen,
} from '../layoutSlice';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  });
});

const baseState = {
  sidebarCollapsed: false,
  sidebarOpenSections: { editor: false, caster: false, settings: false },
  pageListOpen: { reader: true, editor: true },
  version: 1,
};

describe('layoutSlice', () => {
  it("keeps each page list's state (the reader's, the editor's) apart, shown until it's hidden", () => {
    expect(reducer(undefined, { type: '@@INIT' }).pageListOpen).toEqual({ reader: true, editor: true });
    const state = reducer(baseState, setPageListOpen({ place: 'reader', open: false }));
    expect(state.pageListOpen).toEqual({ reader: false, editor: true });
  });

  it('returns initial state with sidebar expanded and all sections closed', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.sidebarOpenSections).toEqual({
      editor: false,
      caster: false,
      settings: false,
    });
  });

  it('setSidebarCollapsed sets an explicit value', () => {
    expect(reducer(baseState, setSidebarCollapsed(true)).sidebarCollapsed).toBe(true);
    expect(reducer({ ...baseState, sidebarCollapsed: true }, setSidebarCollapsed(false)).sidebarCollapsed).toBe(false);
  });

  it('toggleSidebarCollapsed flips the current value', () => {
    expect(reducer(baseState, toggleSidebarCollapsed()).sidebarCollapsed).toBe(true);
    expect(reducer({ ...baseState, sidebarCollapsed: true }, toggleSidebarCollapsed()).sidebarCollapsed).toBe(false);
  });

  it('setSectionOpen sets only the given section, leaving others untouched', () => {
    const state = reducer(baseState, setSectionOpen({ key: 'caster', open: true }));
    expect(state.sidebarOpenSections.caster).toBe(true);
    expect(state.sidebarOpenSections.editor).toBe(false);
    expect(state.sidebarOpenSections.settings).toBe(false);
  });

  it('toggleSection flips only the given section (multi-open supported)', () => {
    const withDashboardOpen = { ...baseState, sidebarOpenSections: { ...baseState.sidebarOpenSections, caster: true } };
    const state = reducer(withDashboardOpen, toggleSection('settings'));
    // Toggling settings should not close caster — multiple sections can be open at once.
    expect(state.sidebarOpenSections.caster).toBe(true);
    expect(state.sidebarOpenSections.settings).toBe(true);
  });

  it('toggleSection closes an already-open section', () => {
    const withSettingsOpen = { ...baseState, sidebarOpenSections: { ...baseState.sidebarOpenSections, settings: true } };
    const state = reducer(withSettingsOpen, toggleSection('settings'));
    expect(state.sidebarOpenSections.settings).toBe(false);
  });
});
