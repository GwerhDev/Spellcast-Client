import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { EditorSelectLanding } from '../index';
import * as db from '../../../../db';

const mockDoc = {
  id: 'doc-1',
  title: 'My Doc',
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

describe('EditorSelectLanding', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('renders the panel', () => {
    vi.spyOn(db, 'getDocumentsFromDB').mockResolvedValue([]);
    renderWithProviders(<EditorSelectLanding />, { store: loggedStore() });
    expect(screen.getByTestId('editor-select')).toBeInTheDocument();
  });

  it('shows search input', () => {
    vi.spyOn(db, 'getDocumentsFromDB').mockResolvedValue([]);
    renderWithProviders(<EditorSelectLanding />, { store: loggedStore() });
    expect(screen.getByTestId('editor-select-search')).toBeInTheDocument();
  });

  it('shows empty state when no documents', async () => {
    vi.spyOn(db, 'getDocumentsFromDB').mockResolvedValue([]);
    renderWithProviders(<EditorSelectLanding />, { store: loggedStore() });
    expect(await screen.findByTestId('editor-select-empty')).toBeInTheDocument();
  });

  it('shows no-results when query matches nothing', async () => {
    vi.spyOn(db, 'getDocumentsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<EditorSelectLanding />, { store: loggedStore() });
    await screen.findByTestId('editor-select-search');
    fireEvent.change(screen.getByTestId('editor-select-search'), { target: { value: 'zzznomatch' } });
    expect(await screen.findByTestId('editor-select-no-results')).toBeInTheDocument();
  });
});
