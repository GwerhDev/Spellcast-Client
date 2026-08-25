import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SpellDetail } from '../index';
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

const renderDetail = (store = loggedStore()) =>
  renderWithProviders(
    <Routes>
      <Route path="/spell/:id" element={<SpellDetail />} />
    </Routes>,
    { store, initialPath: '/spell/doc-1' }
  );

describe('SpellDetail', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('shows loading state while fetching', () => {
    vi.spyOn(db, 'getSpellById').mockReturnValue(new Promise(() => {}));
    renderDetail();
    expect(screen.getByTestId('spell-detail-loading')).toBeInTheDocument();
  });

  it('shows error when document is not found', async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(undefined);
    renderDetail();
    expect(await screen.findByTestId('spell-detail-error')).toBeInTheDocument();
  });

  it('shows document detail when loaded', async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
    renderDetail();
    expect(await screen.findByTestId('spell-detail-title')).toBeInTheDocument();
  });

  it('renders the continue/edit/delete action buttons', async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
    renderDetail();
    await screen.findByTestId('spell-detail-title');
    expect(screen.getByTestId('spell-detail-continue-btn')).toBeInTheDocument();
    expect(screen.getByTestId('spell-detail-edit-btn')).toBeInTheDocument();
    expect(screen.getByTestId('spell-detail-delete-btn')).toBeInTheDocument();
  });

  it('dispatches invalidateSpellList after confirming delete, so SpellList/LastSpells refresh', async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
    vi.spyOn(db, 'deleteSpellFromDB').mockResolvedValue(undefined);
    const store = loggedStore();
    renderDetail(store);
    await screen.findByTestId('spell-detail-title');
    expect(store.getState().spellReader.listVersion).toBe(0);

    fireEvent.click(screen.getByTestId('spell-detail-delete-btn'));
    fireEvent.click(await screen.findByTestId('delete-confirm-confirm-btn'));

    await waitFor(() => expect(store.getState().spellReader.listVersion).toBe(1));
  });
});
