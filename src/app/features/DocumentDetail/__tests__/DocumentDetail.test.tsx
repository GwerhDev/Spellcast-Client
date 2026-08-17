import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('renders the continue/edit/delete action buttons', async () => {
    vi.spyOn(db, 'getDocumentById').mockResolvedValue(mockDoc as never);
    renderDetail();
    await screen.findByTestId('document-detail-title');
    expect(screen.getByTestId('document-detail-continue-btn')).toBeInTheDocument();
    expect(screen.getByTestId('document-detail-edit-btn')).toBeInTheDocument();
    expect(screen.getByTestId('document-detail-delete-btn')).toBeInTheDocument();
  });

  it('dispatches invalidateDocumentList after confirming delete, so DocumentList/LastDocuments refresh', async () => {
    vi.spyOn(db, 'getDocumentById').mockResolvedValue(mockDoc as never);
    vi.spyOn(db, 'deleteDocumentFromDB').mockResolvedValue(undefined);
    const store = loggedStore();
    renderDetail(store);
    await screen.findByTestId('document-detail-title');
    expect(store.getState().pdfReader.listVersion).toBe(0);

    fireEvent.click(screen.getByTestId('document-detail-delete-btn'));
    fireEvent.click(await screen.findByTestId('delete-confirm-confirm-btn'));

    await waitFor(() => expect(store.getState().pdfReader.listVersion).toBe(1));
  });
});
