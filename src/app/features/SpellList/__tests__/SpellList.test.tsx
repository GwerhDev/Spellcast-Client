import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SpellList } from '../index';
import * as db from '../../../../db';

const mockDoc = {
  id: 'doc-1',
  title: 'Test Document',
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

describe('SpellList', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('shows skeleton cards while fetching', () => {
    // Never resolves — keeps isLoading=true
    vi.spyOn(db, 'getSpellsFromDB').mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SpellList />, { store: loggedStore() });
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons.length).toBe(10);
  });

  it('shows empty state when no documents', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([]);
    renderWithProviders(<SpellList />, { store: loggedStore() });
    expect(await screen.findByTestId('spell-list-empty')).toBeInTheDocument();
  });

  it('shows no-results message when query matches nothing', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<SpellList query="zzznomatch" />, { store: loggedStore() });
    expect(await screen.findByTestId('spell-list-no-results')).toBeInTheDocument();
  });
});
