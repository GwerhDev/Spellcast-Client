import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Sidebar } from '../Sidebar';
import { mockMatchMedia } from '../../../../test/mockMatchMedia';

describe('Sidebar', () => {
  // The desktop sidebar (its toggle, its accordions): the test window is 1024px wide, which is
  // the mobile layout's, so it's told it's a desktop.
  beforeEach(() => { mockMatchMedia(false); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('renders the expanded panel when sidebarCollapsed is false', () => {
    renderWithProviders(<Sidebar />, { preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: false, caster: false, settings: false }, pageListOpen: { reader: true, editor: true } } } });
    expect(screen.getByTestId('sidebar-panel')).toBeInTheDocument();
  });

  it('renders the collapsed rail when sidebarCollapsed is true', () => {
    renderWithProviders(<Sidebar />, { preloadedState: { layout: { version: 1, sidebarCollapsed: true, sidebarOpenSections: { editor: false, caster: false, settings: false }, pageListOpen: { reader: true, editor: true } } } });
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
  });

  it('dispatches toggleSidebarCollapsed when the toggle button is clicked', () => {
    renderWithProviders(<Sidebar />, { preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: false, caster: false, settings: false }, pageListOpen: { reader: true, editor: true } } } });
    fireEvent.click(screen.getByTestId('sidebar-toggle-btn'));
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
  });

  it('auto-opens both the parent section and its matching sub-section for a flat item route', () => {
    renderWithProviders(<Sidebar />, {
      initialPath: '/caster/settings/storage',
      preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: false, caster: false, settings: false }, pageListOpen: { reader: true, editor: true } } },
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
      preloadedState: { layout: { version: 1, sidebarCollapsed: false, sidebarOpenSections: { editor: true, caster: false, settings: false }, pageListOpen: { reader: true, editor: true } } },
    });
    expect(screen.getByTestId('sidebar-section-body-caster')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-body-settings')).toBeInTheDocument();
  });
});
