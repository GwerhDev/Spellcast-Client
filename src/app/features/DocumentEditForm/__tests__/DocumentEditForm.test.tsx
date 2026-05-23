import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { DocumentEditForm } from '../index';

vi.mock('../../../../db', () => ({
  getDocumentById: vi.fn(),
  updateDocumentContent: vi.fn(),
}));

vi.mock('../../../../app/components/Editors/DocumentEditor', () => ({
  DocumentEditor: () => null,
}));

import { getDocumentById } from '../../../../db';

const mockDoc = {
  id: 'doc-1',
  title: 'Test Doc',
  pagesContent: JSON.stringify([{ type: 'doc', content: [{ type: 'paragraph' }] }]),
  originalPagesContent: null,
};

const renderForm = (initialPath = '/editor/doc-1') =>
  renderWithProviders(
    <Routes>
      <Route path="/editor/:id" element={<DocumentEditForm />} />
      <Route path="/editor/:id/:page" element={<DocumentEditForm />} />
    </Routes>,
    { initialPath }
  );

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
