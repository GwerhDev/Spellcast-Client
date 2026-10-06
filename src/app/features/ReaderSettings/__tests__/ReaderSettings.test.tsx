import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { ReaderSettings } from '../index';
import { setShowReaderSettings, setSpellFile } from '../../../../store/spellReaderSlice';
import { setActiveCompanion, unlockAsset } from '../../../../store/casterInventorySlice';
import * as cosmeticsDb from '../../../../db/spellCosmetics';

// A reader open on a spell, its settings shown, the caster owning a page background and
// the companion.
const readerStore = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
  store.dispatch(setShowReaderSettings(true));
  store.dispatch(unlockAsset('parchment'));
  store.dispatch(unlockAsset('cats'));
  return store;
};

describe('ReaderSettings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(cosmeticsDb, 'getSpellCosmetics').mockResolvedValue({});
    vi.spyOn(cosmeticsDb, 'setSpellCosmetic').mockImplementation(async (_spellId, _userId, kind, assetId) => (assetId === undefined ? {} : { [kind]: assetId }));
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<ReaderSettings />);
    expect(container).toBeInTheDocument();
  });

  // The page background is picked for the open spell, as its cover frame is: following the
  // caster's default, none (the app's own paper), or one of the caster's own.
  describe('page background', () => {
    it("picks for this spell alone, leaving the caster's default as it is", async () => {
      const store = readerStore();
      renderWithProviders(<ReaderSettings />, { store });
      fireEvent.click(screen.getByTestId('tab-appearance'));
      await waitFor(() => expect(screen.getByTestId('reader-page-bg-pick-default').className).toMatch(/bgSwatchActive/));

      fireEvent.click(screen.getByTestId('reader-page-bg-parchment'));
      expect(cosmeticsDb.setSpellCosmetic).toHaveBeenCalledWith('spell-1', 'user-1', 'pageBackground', 'parchment');
      await waitFor(() => expect(screen.getByTestId('reader-page-bg-parchment').className).toMatch(/bgSwatchActive/));
      expect(store.getState().casterInventory.activePageBgId).toBeNull();

      fireEvent.click(screen.getByTestId('reader-page-bg-pick-none'));
      expect(cosmeticsDb.setSpellCosmetic).toHaveBeenLastCalledWith('spell-1', 'user-1', 'pageBackground', null);

      fireEvent.click(screen.getByTestId('reader-page-bg-pick-default'));
      expect(cosmeticsDb.setSpellCosmetic).toHaveBeenLastCalledWith('spell-1', 'user-1', 'pageBackground', undefined);
    });

    it("doesn't list the app's own paper as an item: it's what none shows", () => {
      renderWithProviders(<ReaderSettings />, { store: readerStore() });
      fireEvent.click(screen.getByTestId('tab-appearance'));
      expect(screen.getByTestId('reader-page-bg-pick-none')).toBeInTheDocument();
      expect(screen.queryByTestId('reader-page-bg-default')).not.toBeInTheDocument();
    });
  });

  // "Use" picks the companion for the open spell; the default for every spell is the
  // inventory's.
  describe('companion', () => {
    it("follows the caster's default until the spell picks its own, for this spell alone", async () => {
      const store = readerStore();
      store.dispatch(setActiveCompanion('cats'));
      renderWithProviders(<ReaderSettings />, { store });
      fireEvent.click(screen.getByTestId('tab-companions'));
      await waitFor(() => expect(screen.getByTestId('companion-card-pick-default').className).toMatch(/productCardActive/));

      fireEvent.click(screen.getByTestId('companion-toggle-cats'));
      expect(cosmeticsDb.setSpellCosmetic).toHaveBeenCalledWith('spell-1', 'user-1', 'companion', 'cats');
      await waitFor(() => expect(screen.getByTestId('companion-card-cats').className).toMatch(/productCardActive/));
      expect(store.getState().casterInventory.activeCompanionId).toBe('cats');

      fireEvent.click(screen.getByTestId('companion-toggle-pick-default'));
      expect(cosmeticsDb.setSpellCosmetic).toHaveBeenLastCalledWith('spell-1', 'user-1', 'companion', undefined);
    });

    it('none is one more card: picked for this spell like any companion', async () => {
      const store = readerStore();
      store.dispatch(setActiveCompanion('cats'));
      renderWithProviders(<ReaderSettings />, { store });
      fireEvent.click(screen.getByTestId('tab-companions'));
      await waitFor(() => expect(screen.getByTestId('companion-card-pick-default').className).toMatch(/productCardActive/));
      fireEvent.click(screen.getByTestId('companion-toggle-pick-none'));
      expect(cosmeticsDb.setSpellCosmetic).toHaveBeenCalledWith('spell-1', 'user-1', 'companion', null);
      await waitFor(() => expect(screen.getByTestId('companion-card-pick-none').className).toMatch(/productCardActive/));
    });
  });
});
