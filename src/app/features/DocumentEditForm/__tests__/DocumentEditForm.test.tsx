import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { DocumentEditForm } from '../index';
import { setSession } from '../../../../store/sessionSlice';

vi.mock('../../../../db', () => ({
  getDocumentById: vi.fn(),
  updateDocumentContent: vi.fn(),
}));

vi.mock('../../../../app/components/Editors/DocumentEditor', () => ({
  DocumentEditor: () => null,
}));

import { getDocumentById } from '../../../../db';

beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

const mockDoc = {
  id: 'doc-1',
  title: 'Test Doc',
  pagesContent: JSON.stringify([{ type: 'doc', content: [{ type: 'paragraph' }] }]),
  originalPagesContent: null,
};

const renderForm = (initialPath = '/editor/doc-1') => {
  const store = makeStore();
  store.dispatch(setSession({ logged: true, userData: { id: 'user-1', username: 'Test', loader: false } }));
  return renderWithProviders(
    <Routes>
      <Route path="/editor/:id" element={<DocumentEditForm />} />
      <Route path="/editor/:id/:page" element={<DocumentEditForm />} />
    </Routes>,
    { store, initialPath }
  );
};

beforeEach(() => {
  vi.mocked(getDocumentById).mockResolvedValue(mockDoc as never);
});

describe('DocumentEditForm', () => {
  it('shows loading state initially', () => {
    renderForm();
    expect(screen.getByTestId('document-edit-form-loading')).toBeInTheDocument();
  });

  it('shows error state when document is not found', async () => {
    vi.mocked(getDocumentById).mockResolvedValueOnce(null as never);
    renderForm();
    expect(await screen.findByTestId('document-edit-form-error')).toBeInTheDocument();
  });

  it('renders form after document loads', async () => {
    renderForm();
    expect(await screen.findByTestId('document-edit-form')).toBeInTheDocument();
  });
});
