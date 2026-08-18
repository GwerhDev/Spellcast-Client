import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SpellDetailModal } from '../SpellDetailModal';
import * as db from '../../../../db';

const mockDoc = {
  id: 'doc-1',
  title: 'My Book',
  createdAt: new Date().toISOString(),
  pagesContent: JSON.stringify([{}, {}, {}]),
  cover: null,
  progress: null,
  userId: 'user-1',
};

const loggedStore = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  return store;
};

describe('SpellDetailModal', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('renders nothing when show is false', () => {
    renderWithProviders(<SpellDetailModal spellId="doc-1" show={false} onClose={vi.fn()} />, { store: loggedStore() });
    expect(screen.queryByTestId('spell-detail-modal-continue-btn')).not.toBeInTheDocument();
  });

  // Mirrors SpellDetail.test.tsx's equivalent page-level assertion — same testid suffixes
  // on both surfaces (page vs modal) as a guard against the two re-diverging visually.
  it('shows the continue/edit/delete action buttons once the document loads', async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
    renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });
    expect(await screen.findByTestId('spell-detail-modal-continue-btn')).toBeInTheDocument();
    expect(screen.getByTestId('spell-detail-modal-edit-btn')).toBeInTheDocument();
    expect(screen.getByTestId('spell-detail-modal-delete-btn')).toBeInTheDocument();
  });

  it('dispatches invalidateSpellList after confirming delete', async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
    vi.spyOn(db, 'deleteSpellFromDB').mockResolvedValue(undefined);
    const store = loggedStore();
    renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store });
    await screen.findByTestId('spell-detail-modal-delete-btn');
    expect(store.getState().pdfReader.listVersion).toBe(0);

    fireEvent.click(screen.getByTestId('spell-detail-modal-delete-btn'));
    fireEvent.click(await screen.findByTestId('delete-confirm-confirm-btn'));

    await waitFor(() => expect(store.getState().pdfReader.listVersion).toBe(1));
  });
});
