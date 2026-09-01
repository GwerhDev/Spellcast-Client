import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { CasterInventoryLanding } from '../index';

const baseInventory = {
  version: 5,
  unlockedIds: [] as string[],
  activeSoundBgId: null as string | null,
  activePageBgId: null as string | null,
  activeCompanionId: null as string | null,
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

  it('marks the currently active companion with the active pill', () => {
    renderWithProviders(<CasterInventoryLanding />, {
      store: storeWith({ unlockedIds: ['cats'], activeCompanionId: 'cats' }),
    });
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });
});
