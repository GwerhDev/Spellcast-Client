import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { DocumentList } from '../index';
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

describe('DocumentList', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('shows skeleton cards while fetching', () => {
    // Never resolves — keeps isLoading=true
    vi.spyOn(db, 'getDocumentsFromDB').mockReturnValue(new Promise(() => {}));
    renderWithProviders(<DocumentList />, { store: loggedStore() });
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons.length).toBe(10);
  });

  it('shows empty state when no documents', async () => {
    vi.spyOn(db, 'getDocumentsFromDB').mockResolvedValue([]);
    renderWithProviders(<DocumentList />, { store: loggedStore() });
    expect(await screen.findByTestId('document-list-empty')).toBeInTheDocument();
  });

  it('shows no-results message when query matches nothing', async () => {
    vi.spyOn(db, 'getDocumentsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<DocumentList query="zzznomatch" />, { store: loggedStore() });
    expect(await screen.findByTestId('document-list-no-results')).toBeInTheDocument();
  });
});
