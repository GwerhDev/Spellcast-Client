import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders the expanded panel when sidebarCollapsed is false', () => {
    renderWithProviders(<Sidebar />, { preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: false, caster: false, settings: false } } } });
    expect(screen.getByTestId('sidebar-panel')).toBeInTheDocument();
  });

  it('renders the collapsed rail when sidebarCollapsed is true', () => {
    renderWithProviders(<Sidebar />, { preloadedState: { layout: { version: 1, sidebarCollapsed: true, sidebarOpenSections: { editor: false, caster: false, settings: false } } } });
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
  });

  it('dispatches toggleSidebarCollapsed when the toggle button is clicked', () => {
    renderWithProviders(<Sidebar />, { preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: false, caster: false, settings: false } } } });
    fireEvent.click(screen.getByTestId('sidebar-toggle-btn'));
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
  });

  it('auto-opens both the parent section and its matching sub-section for a flat item route', () => {
    renderWithProviders(<Sidebar />, {
      initialPath: '/caster/settings/storage',
      preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: false, caster: false, settings: false } } },
    });
    // "storage" is a flat item under "settings" (TCORE-109, reverted from its own
    // Inventory sub-tab) -- landing on /caster/settings/storage should reveal both
    // "caster" (its ancestor) and "settings" (its own matching section).
    expect(screen.getByTestId('sidebar-section-body-caster')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-body-settings')).toBeInTheDocument();
  });

  it('auto-opening a matched section does not close a sibling section already open', () => {
    renderWithProviders(<Sidebar />, {
      initialPath: '/caster/settings/storage',
      preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: true, caster: false, settings: false } } },
    });
    expect(screen.getByTestId('sidebar-section-body-caster')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-body-settings')).toBeInTheDocument();
  });
});
