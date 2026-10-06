import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { PlayerPreferences } from '../index';
import { setSpellFile } from '../../../../store/spellReaderSlice';
import { setActiveSoundBg } from '../../../../store/casterInventorySlice';
import * as cosmeticsDb from '../../../../db/spellCosmetics';

describe('PlayerPreferences', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(cosmeticsDb, 'getSpellCosmetics').mockResolvedValue({});
    vi.spyOn(cosmeticsDb, 'setSpellCosmetic').mockImplementation(async (_spellId, _userId, kind, assetId) => (assetId === undefined ? {} : { [kind]: assetId }));
  });

  it('renders the player preferences container', () => {
    renderWithProviders(<PlayerPreferences />);
    expect(screen.getByTestId('player-preferences')).toBeInTheDocument();
  });

  // The sound background is picked for the loaded spell, as its cover frame is.
  it("picks the loaded spell's sound background, leaving the caster's default as it is", async () => {
    const store = makeStore();
    store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    store.dispatch(setActiveSoundBg('rain-window'));
    renderWithProviders(<PlayerPreferences />, { store });
    await waitFor(() => expect(screen.getByTestId('player-sound-bg-pick-default').className).toMatch(/soundBgItemActive/));

    fireEvent.click(screen.getByTestId('player-sound-bg-pick-none'));
    expect(cosmeticsDb.setSpellCosmetic).toHaveBeenCalledWith('spell-1', 'user-1', 'soundBackground', null);
    await waitFor(() => expect(screen.getByTestId('player-sound-bg-pick-none').className).toMatch(/soundBgItemActive/));
    expect(store.getState().casterInventory.activeSoundBgId).toBe('rain-window');
  });
});
