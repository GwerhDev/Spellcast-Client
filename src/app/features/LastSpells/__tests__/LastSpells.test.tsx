import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { LastSpells } from '../index';
import * as db from '../../../../db';

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
});
