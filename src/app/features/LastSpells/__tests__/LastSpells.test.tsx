import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { LastSpells } from '../index';
import * as db from '../../../../db';
import { setSpellFile } from '../../../../store/spellReaderSlice';

// The detail modal loads the spell on its own; a stub is enough to see which spell a card opened.
vi.mock('../../../components/Modals/SpellDetailModal', () => ({
  SpellDetailModal: ({ spellId, show }: { spellId: string | null; show: boolean }) =>
    show ? <div data-testid="spell-detail-modal-stub">{spellId}</div> : null,
}));

const mockDoc = {
  id: 'doc-1',
  title: 'Sample Book',
  createdAt: new Date().toISOString(),
  pagesContent: null,
  cover: null,
  progress: null,
  userId: 'user-1',
};

const loggedStore = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  return store;
};

describe('LastSpells', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('shows 5 skeleton cards while loading', () => {
    vi.spyOn(db, 'getSpellsFromDB').mockReturnValue(new Promise(() => {}));
    renderWithProviders(<LastSpells />, { store: loggedStore() });
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons.length).toBe(5);
  });

  it('renders nothing when there are no documents', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([]);
    const { container } = renderWithProviders(<LastSpells />, { store: loggedStore() });
    // Wait for loading to finish — component returns null, nothing should be in the DOM
    await vi.waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('shows document cards when documents exist', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<LastSpells />, { store: loggedStore() });
    expect(await screen.findByTestId('spell-card-doc-1')).toBeInTheDocument();
  });

  it('announces the deletion to every spell list (listVersion), not only refetching itself', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    vi.spyOn(db, 'deleteSpellFromDB').mockResolvedValue(undefined as never);
    const store = loggedStore();
    renderWithProviders(<LastSpells />, { store });
    await screen.findByTestId('spell-card-doc-1');
    const before = store.getState().spellReader.listVersion;
    fireEvent.click(screen.getByTestId('spell-card-menu-btn-doc-1'));
    fireEvent.click(screen.getByTestId('spell-card-delete-doc-1'));
    fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));
    await waitFor(() => expect(store.getState().spellReader.listVersion).toBe(before + 1));
    expect(db.deleteSpellFromDB).toHaveBeenCalledWith('doc-1', 'user-1');
  });

  it('unloads the spell from the player when the one deleted is the loaded spell', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    vi.spyOn(db, 'deleteSpellFromDB').mockResolvedValue(undefined as never);
    const store = loggedStore();
    store.dispatch(setSpellFile({ id: 'doc-1', title: 'Sample Book', userId: 'user-1' }));
    renderWithProviders(<LastSpells />, { store });
    await screen.findByTestId('spell-card-doc-1');
    fireEvent.click(screen.getByTestId('spell-card-menu-btn-doc-1'));
    fireEvent.click(screen.getByTestId('spell-card-delete-doc-1'));
    fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));
    await waitFor(() => expect(store.getState().spellReader.spellId).toBeNull());
  });

  it('opens the spell detail modal when a card is clicked, instead of navigating', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<LastSpells />, { store: loggedStore() });
    expect(screen.queryByTestId('spell-detail-modal-stub')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('spell-card-doc-1'));
    expect(screen.getByTestId('spell-detail-modal-stub')).toHaveTextContent('doc-1');
  });
});
