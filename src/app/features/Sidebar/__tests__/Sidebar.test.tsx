import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders the expanded panel when sidebarCollapsed is false', () => {
    renderWithProviders(<Sidebar />, { preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: false, caster: false, storage: false, settings: false } } } });
    expect(screen.getByTestId('sidebar-panel')).toBeInTheDocument();
  });

  it('renders the collapsed rail when sidebarCollapsed is true', () => {
    renderWithProviders(<Sidebar />, { preloadedState: { layout: { version: 1, sidebarCollapsed: true, sidebarOpenSections: { editor: false, caster: false, storage: false, settings: false } } } });
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
  });

  it('dispatches toggleSidebarCollapsed when the toggle button is clicked', () => {
    renderWithProviders(<Sidebar />, { preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: false, caster: false, storage: false, settings: false } } } });
    fireEvent.click(screen.getByTestId('sidebar-toggle-btn'));
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
  });

  it('auto-opens both the parent section and its nested sub-section matching the current route', () => {
    renderWithProviders(<Sidebar />, {
      initialPath: '/caster/storage/local',
      preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: false, caster: false, storage: false, settings: false } } },
    });
    // "storage" is nested under "caster" — landing on /caster/storage/local should reveal both.
    expect(screen.getByTestId('sidebar-section-body-caster')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-body-storage')).toBeInTheDocument();
  });

  it('auto-opening a matched section does not close a sibling sub-section already open', () => {
    // "settings" is nested under "caster", so it's only rendered once "user" is open —
    // pre-open both "caster" and "settings" to simulate that prior state, then confirm
    // landing on /caster/storage/local (which auto-opens "storage") leaves "settings" open too.
    renderWithProviders(<Sidebar />, {
      initialPath: '/caster/storage/local',
      preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: false, caster: true, storage: false, settings: true } } },
    });
    expect(screen.getByTestId('sidebar-section-body-settings')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-body-storage')).toBeInTheDocument();
  });
});
