import { describe, it, expect, vi, beforeEach } from 'vitest';
import reducer, {
  setSidebarCollapsed,
  toggleSidebarCollapsed,
  setSectionOpen,
  toggleSection,
} from '../layoutSlice';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  });
});

const baseState = {
  sidebarCollapsed: false,
  sidebarOpenSections: { editor: false, user: false, storage: false, settings: false },
  version: 1,
};

describe('layoutSlice', () => {
  it('returns initial state with sidebar expanded and all sections closed', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.sidebarOpenSections).toEqual({
      editor: false,
      user: false,
      storage: false,
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
    const state = reducer(baseState, setSectionOpen({ key: 'user', open: true }));
    expect(state.sidebarOpenSections.user).toBe(true);
    expect(state.sidebarOpenSections.storage).toBe(false);
    expect(state.sidebarOpenSections.settings).toBe(false);
  });

  it('toggleSection flips only the given section (multi-open supported)', () => {
    const withDashboardOpen = { ...baseState, sidebarOpenSections: { ...baseState.sidebarOpenSections, user: true } };
    const state = reducer(withDashboardOpen, toggleSection('storage'));
    // Toggling storage should not close user — multiple sections can be open at once.
    expect(state.sidebarOpenSections.user).toBe(true);
    expect(state.sidebarOpenSections.storage).toBe(true);
  });

  it('toggleSection closes an already-open section', () => {
    const withStorageOpen = { ...baseState, sidebarOpenSections: { ...baseState.sidebarOpenSections, storage: true } };
    const state = reducer(withStorageOpen, toggleSection('storage'));
    expect(state.sidebarOpenSections.storage).toBe(false);
  });
});
