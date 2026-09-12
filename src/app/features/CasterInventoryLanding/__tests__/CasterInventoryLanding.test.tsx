import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { CasterInventoryLanding } from '../index';

const baseInventory = {
  version: 6,
  unlockedIds: [] as string[],
  activeSoundBgId: null as string | null,
  activePageBgId: null as string | null,
  activeCompanionId: null as string | null,
  activeCoverFrameId: null as string | null,
  soundBgVolume: 0.35,
  masterVolume: 1,
  companionPlacements: {},
};

const storeWith = (overrides: Partial<typeof baseInventory>) =>
  makeStore({ casterInventory: { ...baseInventory, ...overrides } });

describe('CasterInventoryLanding', () => {
  it('renders the inventory page', () => {
    renderWithProviders(<CasterInventoryLanding />, { store: storeWith({}) });
    expect(screen.getByTestId('caster-inventory')).toBeInTheDocument();
  });

  it('only shows owned sound/page backgrounds and companions, not the full catalog', () => {
    renderWithProviders(<CasterInventoryLanding />, {
      store: storeWith({ unlockedIds: ['rain-window', 'default', 'cats'] }),
    });
    expect(screen.getByTestId('sound-card-rain-window')).toBeInTheDocument();
    expect(screen.queryByTestId('sound-card-cafe-murmur')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-card-default')).toBeInTheDocument();
    expect(screen.queryByTestId('page-card-parchment')).not.toBeInTheDocument();
    expect(screen.getByTestId('companion-card-cats')).toBeInTheDocument();
  });

  it('shows the equip toggle (not an owned/unlock badge) on owned items -- TCORE-109 equip surface', () => {
    renderWithProviders(<CasterInventoryLanding />, {
      store: storeWith({ unlockedIds: ['rain-window'] }),
    });
    expect(screen.getByTestId('sound-toggle-rain-window')).toBeInTheDocument();
    expect(screen.queryByTestId('sound-owned-rain-window')).not.toBeInTheDocument();
  });

  it('dispatches setActiveSoundBg when equipping an owned sound background', () => {
    const store = storeWith({ unlockedIds: ['rain-window'] });
    renderWithProviders(<CasterInventoryLanding />, { store });
    fireEvent.click(screen.getByTestId('sound-toggle-rain-window'));
    expect(store.getState().casterInventory.activeSoundBgId).toBe('rain-window');
  });

  it('dispatches setActivePageBg when equipping an owned page background', () => {
    const store = storeWith({ unlockedIds: ['default'] });
    renderWithProviders(<CasterInventoryLanding />, { store });
    fireEvent.click(screen.getByTestId('page-card-default'));
    expect(store.getState().casterInventory.activePageBgId).toBe('default');
  });

  it('dispatches setActiveCompanion when equipping an owned companion', () => {
    const store = storeWith({ unlockedIds: ['cats'] });
    renderWithProviders(<CasterInventoryLanding />, { store });
    fireEvent.click(screen.getByTestId('companion-toggle-cats'));
    expect(store.getState().casterInventory.activeCompanionId).toBe('cats');
  });

  it('marks the currently default companion with the default pill', () => {
    renderWithProviders(<CasterInventoryLanding />, {
      store: storeWith({ unlockedIds: ['cats'], activeCompanionId: 'cats' }),
    });
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  // TCORE-123: unlike the other categories, equipping a cover frame here only ever sets/
  // clears the GLOBAL default -- a spell's own explicit pick (SpellDetail) still overrides it.
  describe('cover frames', () => {
    it('only shows owned cover frames, not the full catalog', () => {
      renderWithProviders(<CasterInventoryLanding />, { store: storeWith({}) });
      expect(screen.queryByTestId('cover-frame-card-grimoire')).not.toBeInTheDocument();
    });

    it('shows the equip toggle on an owned cover frame', () => {
      renderWithProviders(<CasterInventoryLanding />, {
        store: storeWith({ unlockedIds: ['grimoire'] }),
      });
      expect(screen.getByTestId('cover-frame-toggle-grimoire')).toBeInTheDocument();
    });

    it('dispatches setActiveCoverFrame (the global default) when equipping an owned border', () => {
      const store = storeWith({ unlockedIds: ['grimoire'] });
      renderWithProviders(<CasterInventoryLanding />, { store });
      fireEvent.click(screen.getByTestId('cover-frame-toggle-grimoire'));
      expect(store.getState().casterInventory.activeCoverFrameId).toBe('grimoire');
    });

    it('clicking the toggle again clears the global default', () => {
      const store = storeWith({ unlockedIds: ['grimoire'], activeCoverFrameId: 'grimoire' });
      renderWithProviders(<CasterInventoryLanding />, { store });
      fireEvent.click(screen.getByTestId('cover-frame-toggle-grimoire'));
      expect(store.getState().casterInventory.activeCoverFrameId).toBeNull();
    });
  });
});
