import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SpellEditForm } from '../index';
import { setSession } from '../../../../store/sessionSlice';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn(),
  updateSpellContent: vi.fn(),
}));

vi.mock('../../../../db/originalPdfs', () => ({
  hasOriginalPdf: vi.fn(),
}));

const refreshOneMock = vi.fn();
vi.mock('../../../../hooks/useRefreshSpellMetadataFromPdf', () => ({
  useRefreshSpellMetadataFromPdf: () => ({ refreshOne: refreshOneMock, refreshMany: vi.fn(), isRefreshing: false }),
}));

vi.mock('../../../../app/components/Editors/SpellEditor', () => ({
  SpellEditor: () => null,
}));

import { getSpellById, updateSpellContent } from '../../../../db';
import { hasOriginalPdf } from '../../../../db/originalPdfs';

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
      <Route path="/editor/:id" element={<SpellEditForm />} />
      <Route path="/editor/:id/:page" element={<SpellEditForm />} />
    </Routes>,
    { store, initialPath }
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSpellById).mockResolvedValue(mockDoc as never);
  vi.mocked(updateSpellContent).mockResolvedValue(undefined as never);
  vi.mocked(hasOriginalPdf).mockResolvedValue(false);
});

describe('SpellEditForm', () => {
  it('shows loading state initially', () => {
    renderForm();
    expect(screen.getByTestId('spell-edit-form-loading')).toBeInTheDocument();
  });

  it('shows error state when document is not found', async () => {
    vi.mocked(getSpellById).mockResolvedValueOnce(null as never);
    renderForm();
    expect(await screen.findByTestId('spell-edit-form-error')).toBeInTheDocument();
  });

  it('renders form after document loads', async () => {
    renderForm();
    expect(await screen.findByTestId('spell-edit-form')).toBeInTheDocument();
  });

  describe('metadata editing (TCORE-103)', () => {
    it('loads existing metadata and auto-expands the section', async () => {
      vi.mocked(getSpellById).mockResolvedValue({
        ...mockDoc,
        description: 'A tale of dragons',
        author: 'Jane Doe',
        tags: ['fantasy', 'adventure'],
        language: 'en',
      } as never);
      renderForm();

      await waitFor(() => expect(screen.getByTestId('spell-metadata-section')).toBeInTheDocument());
      expect(screen.getByTestId('spell-metadata-description')).toHaveValue('A tale of dragons');
      expect(screen.getByTestId('spell-metadata-author')).toHaveValue('Jane Doe');
      expect(screen.getByTestId('spell-metadata-tags')).toHaveValue('fantasy, adventure');
      expect(screen.getByTestId('spell-metadata-language')).toHaveValue('en');
    });

    it('editing a metadata field enables the Save button', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));

      expect(screen.getByTestId('spell-edit-save-btn')).toBeDisabled();
      fireEvent.change(screen.getByTestId('spell-metadata-author'), { target: { value: 'New Author' } });
      expect(screen.getByTestId('spell-edit-save-btn')).not.toBeDisabled();
    });

    it('Save persists description/author/tags/language alongside title/pagesContent', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      fireEvent.change(screen.getByTestId('spell-metadata-description'), { target: { value: 'A tale' } });
      fireEvent.change(screen.getByTestId('spell-metadata-tags'), { target: { value: 'fantasy, adventure' } });
      fireEvent.click(screen.getByTestId('spell-edit-save-btn'));

      await waitFor(() => expect(updateSpellContent).toHaveBeenCalled());
      const call = vi.mocked(updateSpellContent).mock.calls[0][2];
      expect(call.description).toBe('A tale');
      expect(call.tags).toEqual(['fantasy', 'adventure']);
    });

    it('the refresh-from-PDF button is disabled when the spell has no stored original PDF', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(false);
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));

      await waitFor(() => expect(hasOriginalPdf).toHaveBeenCalledWith('doc-1'));
      expect(screen.getByTestId('spell-metadata-refresh-btn')).toBeDisabled();
    });

    it('refresh-from-PDF: confirming applies the returned metadata to the form and reports success', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(true);
      refreshOneMock.mockResolvedValue({
        status: 'updated',
        metadata: { description: 'From PDF', author: 'PDF Author', tags: ['x', 'y'], language: 'fr' },
      });
      const store = makeStore();
      store.dispatch(setSession({ logged: true, userData: { id: 'user-1', username: 'Test', loader: false } }));
      renderWithProviders(
        <Routes><Route path="/editor/:id" element={<SpellEditForm />} /></Routes>,
        { store, initialPath: '/editor/doc-1' }
      );
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      await waitFor(() => expect(screen.getByTestId('spell-metadata-refresh-btn')).not.toBeDisabled());

      fireEvent.click(screen.getByTestId('spell-metadata-refresh-btn'));
      fireEvent.click(await screen.findByTestId('refresh-metadata-confirm-btn'));

      await waitFor(() => expect(refreshOneMock).toHaveBeenCalledWith('doc-1'));
      expect(screen.getByTestId('spell-metadata-description')).toHaveValue('From PDF');
      expect(screen.getByTestId('spell-metadata-tags')).toHaveValue('x, y');
      expect(store.getState().apiResponses.responses).toHaveLength(1);
      expect(store.getState().apiResponses.responses[0].type).toBe('success');
    });

    it('refresh-from-PDF: a skipped result reports it without changing the form fields', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(true);
      refreshOneMock.mockResolvedValue({ status: 'skipped' });
      vi.mocked(getSpellById).mockResolvedValue({ ...mockDoc, author: 'Original Author' } as never);
      const store = makeStore();
      store.dispatch(setSession({ logged: true, userData: { id: 'user-1', username: 'Test', loader: false } }));
      renderWithProviders(
        <Routes><Route path="/editor/:id" element={<SpellEditForm />} /></Routes>,
        { store, initialPath: '/editor/doc-1' }
      );
      // The section auto-expands on its own here (the loaded doc already has an author),
      // so unlike the other tests, no toggle click is needed -- clicking it would collapse it.
      await screen.findByTestId('spell-edit-form');
      await waitFor(() => expect(screen.getByTestId('spell-metadata-refresh-btn')).not.toBeDisabled());

      fireEvent.click(screen.getByTestId('spell-metadata-refresh-btn'));
      fireEvent.click(await screen.findByTestId('refresh-metadata-confirm-btn'));

      await waitFor(() => expect(refreshOneMock).toHaveBeenCalled());
      expect(screen.getByTestId('spell-metadata-author')).toHaveValue('Original Author');
      expect(store.getState().apiResponses.responses[0].type).not.toBe('success');
    });
  });
});
