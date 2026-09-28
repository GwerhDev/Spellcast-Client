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

const openItem = (id: string) => fireEvent.click(screen.getByTestId(`bag-slot-${id}`));

describe('CasterInventoryLanding', () => {
  it('shows the empty state when nothing is owned', () => {
    renderWithProviders(<CasterInventoryLanding />, { store: storeWith({}) });
    expect(screen.getByTestId('inventory-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('inventory-bag')).not.toBeInTheDocument();
  });

  it('puts only owned items in the bag, not the full catalog', () => {
    renderWithProviders(<CasterInventoryLanding />, {
      store: storeWith({ unlockedIds: ['rain-window', 'default', 'cats', 'grimoire'] }),
    });
    expect(screen.getByTestId('bag-slot-rain-window')).toBeInTheDocument();
    expect(screen.getByTestId('bag-slot-default')).toBeInTheDocument();
    expect(screen.getByTestId('bag-slot-cats')).toBeInTheDocument();
    expect(screen.getByTestId('bag-slot-grimoire')).toBeInTheDocument();
    expect(screen.queryByTestId('bag-slot-cafe-murmur')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bag-slot-parchment')).not.toBeInTheDocument();
  });

  it('marks the equipped items in the bag', () => {
    renderWithProviders(<CasterInventoryLanding />, {
      store: storeWith({ unlockedIds: ['rain-window', 'cats'], activeCompanionId: 'cats' }),
    });
    expect(screen.getByTestId('bag-slot-active-cats')).toBeInTheDocument();
    expect(screen.queryByTestId('bag-slot-active-rain-window')).not.toBeInTheDocument();
  });

  it('opens the detail modal when a slot is clicked', () => {
    renderWithProviders(<CasterInventoryLanding />, { store: storeWith({ unlockedIds: ['rain-window'] }) });
    expect(screen.queryByTestId('item-detail')).not.toBeInTheDocument();
    openItem('rain-window');
    expect(screen.getByTestId('item-detail')).toBeInTheDocument();
  });

  it('equips and unequips a sound background from the modal', () => {
    const store = storeWith({ unlockedIds: ['rain-window'] });
    renderWithProviders(<CasterInventoryLanding />, { store });
    openItem('rain-window');
    fireEvent.click(screen.getByTestId('item-detail-activate'));
    expect(store.getState().casterInventory.activeSoundBgId).toBe('rain-window');
    fireEvent.click(screen.getByTestId('item-detail-deactivate'));
    expect(store.getState().casterInventory.activeSoundBgId).toBeNull();
  });

  it('equips a companion from the modal', () => {
    const store = storeWith({ unlockedIds: ['cats'] });
    renderWithProviders(<CasterInventoryLanding />, { store });
    openItem('cats');
    fireEvent.click(screen.getByTestId('item-detail-activate'));
    expect(store.getState().casterInventory.activeCompanionId).toBe('cats');
  });

  it('switches the page background but never clears it', () => {
    const store = storeWith({ unlockedIds: ['default'], activePageBgId: null });
    renderWithProviders(<CasterInventoryLanding />, { store });
    openItem('default');
    fireEvent.click(screen.getByTestId('item-detail-activate'));
    expect(store.getState().casterInventory.activePageBgId).toBe('default');
    expect(screen.getByTestId('item-detail-active')).toBeInTheDocument();
    expect(screen.queryByTestId('item-detail-deactivate')).not.toBeInTheDocument();
  });

  // Equipping a cover frame here only sets/clears the GLOBAL default -- a spell's own
  // explicit pick still overrides it.
  it('sets and clears the global default cover frame from the modal', () => {
    const store = storeWith({ unlockedIds: ['grimoire'] });
    renderWithProviders(<CasterInventoryLanding />, { store });
    openItem('grimoire');
    fireEvent.click(screen.getByTestId('item-detail-activate'));
    expect(store.getState().casterInventory.activeCoverFrameId).toBe('grimoire');
    fireEvent.click(screen.getByTestId('item-detail-deactivate'));
    expect(store.getState().casterInventory.activeCoverFrameId).toBeNull();
  });

  describe('filter tabs', () => {
    const unlockedIds = ['rain-window', 'default', 'cats', 'grimoire'];

    it('shows everything under the default "all" tab', () => {
      renderWithProviders(<CasterInventoryLanding />, { store: storeWith({ unlockedIds }) });
      expect(screen.getByTestId('bag-filter-all')).toHaveAttribute('aria-selected', 'true');
      for (const id of unlockedIds) expect(screen.getByTestId(`bag-slot-${id}`)).toBeInTheDocument();
    });

    it('shows only the selected category', () => {
      renderWithProviders(<CasterInventoryLanding />, { store: storeWith({ unlockedIds }) });
      fireEvent.click(screen.getByTestId('bag-filter-cover-frame'));
      expect(screen.getByTestId('bag-slot-grimoire')).toBeInTheDocument();
      expect(screen.queryByTestId('bag-slot-rain-window')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bag-slot-cats')).not.toBeInTheDocument();
    });

    it('keeps the bag (empty slots) for a category with nothing owned', () => {
      renderWithProviders(<CasterInventoryLanding />, { store: storeWith({ unlockedIds: ['rain-window'] }) });
      fireEvent.click(screen.getByTestId('bag-filter-companion'));
      expect(screen.getByTestId('inventory-bag')).toBeInTheDocument();
      expect(screen.queryByTestId('bag-slot-rain-window')).not.toBeInTheDocument();
    });
  });
});
