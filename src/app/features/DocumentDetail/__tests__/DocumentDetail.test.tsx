import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { DocumentDetail } from '../index';
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
      <Route path="/document/:id" element={<DocumentDetail />} />
    </Routes>,
    { store, initialPath: '/document/doc-1' }
  );

describe('DocumentDetail', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('shows loading state while fetching', () => {
    vi.spyOn(db, 'getDocumentById').mockReturnValue(new Promise(() => {}));
    renderDetail();
    expect(screen.getByTestId('document-detail-loading')).toBeInTheDocument();
  });

  it('shows error when document is not found', async () => {
    vi.spyOn(db, 'getDocumentById').mockResolvedValue(undefined);
    renderDetail();
    expect(await screen.findByTestId('document-detail-error')).toBeInTheDocument();
  });

  it('shows document detail when loaded', async () => {
    vi.spyOn(db, 'getDocumentById').mockResolvedValue(mockDoc as never);
    renderDetail();
    expect(await screen.findByTestId('document-detail-title')).toBeInTheDocument();
  });
});
