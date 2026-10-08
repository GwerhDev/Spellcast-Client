import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SpellEditForm } from '../index';
import { setSession } from '../../../../store/sessionSlice';
import { invalidateContent } from '../../../../store/spellReaderSlice';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn(),
  updateSpellContent: vi.fn(),
  updateSpellFull: vi.fn(),
}));

vi.mock('../../../../db/originalPdfs', () => ({
  hasOriginalPdf: vi.fn(),
  getOriginalPdf: vi.fn(),
}));

const updateFromPdfMock = vi.fn();
vi.mock('../../../../hooks/useUpdateSpellsFromPdf', () => ({
  useUpdateSpellsFromPdf: () => updateFromPdfMock,
}));

vi.mock('../../../../app/components/Editors/SpellEditor', () => ({
  SpellEditor: () => null,
}));

const getDocumentMock = vi.fn();
vi.mock('pdfjs-dist', () => ({
  getDocument: (...args: unknown[]) => getDocumentMock(...args),
  GlobalWorkerOptions: { workerSrc: '' },
}));
vi.mock('pdfjs-dist/build/pdf.worker?url', () => ({ default: '' }));

const renderPageToCoverMock = vi.fn<() => Promise<Blob | null>>(() => Promise.resolve(null));
vi.mock('../../../../utils/pdfUtils', () => ({
  renderPageToCover: (...args: unknown[]) => renderPageToCoverMock(...(args as [])),
  blobToDataUrl: vi.fn((blob: Blob | null) => Promise.resolve(blob ? `data:image/png;base64,${(blob as unknown as { name?: string })?.name ?? 'x'}` : null)),
  // Identity -- see SpellCreateForm's test mock for why downscaling itself isn't tested here.
  downscaleImageBlob: vi.fn((blob: Blob) => Promise.resolve(blob)),
}));

import { getSpellById, updateSpellContent, updateSpellFull } from '../../../../db';
import { hasOriginalPdf, getOriginalPdf } from '../../../../db/originalPdfs';

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
      <Route path="/editor" element={<div data-testid="editor-landing-page" />} />
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
  vi.mocked(updateSpellFull).mockResolvedValue(undefined as never);
  vi.mocked(hasOriginalPdf).mockResolvedValue(false);
  vi.mocked(getOriginalPdf).mockResolvedValue(null);
  renderPageToCoverMock.mockResolvedValue(null);
  getDocumentMock.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve({ getTextContent: () => Promise.resolve({ items: [] }) }) }) });
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

  it('the error state\'s back button navigates to /editor, not the nonexistent spell', async () => {
    vi.mocked(getSpellById).mockResolvedValueOnce(null as never);
    renderForm();
    await screen.findByTestId('spell-edit-form-error');

    fireEvent.click(screen.getByTestId('spell-edit-form-error-back-btn'));

    expect(await screen.findByTestId('editor-landing-page')).toBeInTheDocument();
  });

  it('renders form after document loads', async () => {
    renderForm();
    expect(await screen.findByTestId('spell-edit-form')).toBeInTheDocument();
  });

  describe('metadata editing (TCORE-103)', () => {
    it('loads existing metadata but keeps the section collapsed until toggled', async () => {
      vi.mocked(getSpellById).mockResolvedValue({
        ...mockDoc,
        description: 'A tale of dragons',
        author: 'Jane Doe',
        tags: ['fantasy', 'adventure'],
        language: 'en',
      } as never);
      renderForm();
      await screen.findByTestId('spell-edit-form');

      expect(screen.queryByTestId('spell-metadata-section')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));

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

    it('editing only the title enables the Save button', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');

      expect(screen.getByTestId('spell-edit-save-btn')).toBeDisabled();
      fireEvent.change(screen.getByTestId('spell-edit-title-input'), { target: { value: 'Renamed Spell' } });
      expect(screen.getByTestId('spell-edit-save-btn')).not.toBeDisabled();
    });

    it('Save also invalidates the spell list, so a renamed title shows up in Grimoire/EditorSelect', async () => {
      const { store } = renderForm();
      await screen.findByTestId('spell-edit-form');
      expect(store.getState().spellReader.listVersion).toBe(0);

      fireEvent.change(screen.getByTestId('spell-edit-title-input'), { target: { value: 'Renamed Spell' } });
      fireEvent.click(screen.getByTestId('spell-edit-save-btn'));

      await waitFor(() => expect(store.getState().spellReader.listVersion).toBe(1));
    });

    it('the refresh-from-PDF button is disabled when the spell has no stored original PDF', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(false);
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));

      await waitFor(() => expect(hasOriginalPdf).toHaveBeenCalledWith('doc-1'));
      expect(screen.getByTestId('spell-metadata-refresh-btn')).toBeDisabled();
    });

    // "Update from PDF" reads the spell again from its stored PDF -- pages and metadata --
    // in the background; the form then reloads from what was saved.
    const confirmUpdateFromPdf = async () => {
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      await waitFor(() => expect(screen.getByTestId('spell-metadata-refresh-btn')).not.toBeDisabled());
      fireEvent.click(screen.getByTestId('spell-metadata-refresh-btn'));
      fireEvent.click(await screen.findByTestId('refresh-metadata-confirm-btn'));
    };

    it('update-from-PDF: confirming updates this spell from its PDF, pages and metadata', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(true);
      updateFromPdfMock.mockResolvedValue({ queued: 1, skipped: 0 });
      renderForm();
      await confirmUpdateFromPdf();
      await waitFor(() => expect(updateFromPdfMock).toHaveBeenCalledWith(['doc-1'], { report: false }));
    });

    it('update-from-PDF: once it lands, the form shows the spell as read again from the PDF', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(true);
      updateFromPdfMock.mockResolvedValue({ queued: 1, skipped: 0 });
      const store = makeStore();
      store.dispatch(setSession({ logged: true, userData: { id: 'user-1', username: 'Test', loader: false } }));
      renderWithProviders(
        <Routes><Route path="/editor/:id" element={<SpellEditForm />} /></Routes>,
        { store, initialPath: '/editor/doc-1' }
      );
      await confirmUpdateFromPdf();
      await waitFor(() => expect(updateFromPdfMock).toHaveBeenCalled());

      // The worker saves the spell read again from its PDF, and announces new content.
      vi.mocked(getSpellById).mockResolvedValue({ ...mockDoc, title: 'Title From PDF', description: 'From PDF', author: 'PDF Author' } as never);
      act(() => { store.dispatch(invalidateContent()); });

      await waitFor(() => expect(screen.getByTestId('spell-metadata-description')).toHaveValue('From PDF'));
      expect(screen.getByTestId('spell-metadata-author')).toHaveValue('PDF Author');
      expect(screen.getByTestId('spell-edit-title-input')).toHaveValue('Title From PDF');
    });

    it('update-from-PDF: without a stored PDF, says so and leaves the form alone', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(true);
      updateFromPdfMock.mockResolvedValue({ queued: 0, skipped: 1 });
      vi.mocked(getSpellById).mockResolvedValue({ ...mockDoc, author: 'Original Author' } as never);
      const store = makeStore();
      store.dispatch(setSession({ logged: true, userData: { id: 'user-1', username: 'Test', loader: false } }));
      renderWithProviders(
        <Routes><Route path="/editor/:id" element={<SpellEditForm />} /></Routes>,
        { store, initialPath: '/editor/doc-1' }
      );
      await confirmUpdateFromPdf();

      await waitFor(() => expect(store.getState().apiResponses.responses.at(-1)?.type).toBe('error'));
      expect(screen.getByTestId('spell-metadata-author')).toHaveValue('Original Author');
    });
  });

  describe('cover editing (TCORE-122 -- lives inside "Additional details", as one more metadata field)', () => {
    it('does not offer "use PDF page 1" when the spell has no stored original PDF', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(false);
      renderForm();
      await screen.findByTestId('spell-edit-form');
      await waitFor(() => expect(hasOriginalPdf).toHaveBeenCalledWith('doc-1'));
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      expect(screen.queryByTestId('cover-picker-use-first-page-btn')).not.toBeInTheDocument();
    });

    it('offers "use PDF page 1" when the spell has a stored original PDF', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(true);
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      await waitFor(() => expect(screen.getByTestId('cover-picker-use-first-page-btn')).toBeInTheDocument());
    });

    it('uploading an image saves it as the cover via updateSpellFull', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      const file = new File(['x'], 'cover.png', { type: 'image/png' });
      const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => expect(updateSpellFull).toHaveBeenCalled());
      const call = vi.mocked(updateSpellFull).mock.calls[0][2];
      expect(call.cover).toBe(file);
    });

    it('"use PDF page 1" reads the stored original PDF, renders page 1, and saves it as the cover', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(true);
      const storedPdfBlob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
      vi.mocked(getOriginalPdf).mockResolvedValue(storedPdfBlob);
      const forcedCover = new Blob(['cover-bytes'], { type: 'image/jpeg' });
      renderPageToCoverMock.mockResolvedValue(forcedCover);

      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      await waitFor(() => expect(screen.getByTestId('cover-picker-use-first-page-btn')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('cover-picker-use-first-page-btn'));

      await waitFor(() => expect(getOriginalPdf).toHaveBeenCalledWith('doc-1'));
      await waitFor(() => expect(updateSpellFull).toHaveBeenCalled());
      const call = vi.mocked(updateSpellFull).mock.calls[0][2];
      expect(call.cover).toBe(forcedCover);
    });

    it('does not save (or crash) when "use PDF page 1" finds no stored original PDF', async () => {
      vi.mocked(hasOriginalPdf).mockResolvedValue(true);
      vi.mocked(getOriginalPdf).mockResolvedValue(null);

      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      await waitFor(() => expect(screen.getByTestId('cover-picker-use-first-page-btn')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('cover-picker-use-first-page-btn'));

      await waitFor(() => expect(getOriginalPdf).toHaveBeenCalledWith('doc-1'));
      expect(updateSpellFull).not.toHaveBeenCalled();
    });

    // The cover is the spell's thumbnail only: page 1 stays as the PDF has it.
    it('uploading a new cover saves it as the thumbnail, leaving page 1 as it is', async () => {
      const page1 = { type: 'doc', content: [{ type: 'image', attrs: { src: 'data:image/png;base64,PAGE', alt: null, title: null } }, { type: 'paragraph' }] };
      vi.mocked(getSpellById).mockResolvedValue({ ...mockDoc, pagesContent: JSON.stringify([page1]) } as never);
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      const file = new File(['x'], 'cover.png', { type: 'image/png' });
      const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => expect(updateSpellFull).toHaveBeenCalled());
      const call = vi.mocked(updateSpellFull).mock.calls[0][2];
      expect(call.cover).toBe(file);
      expect(JSON.parse(call.pagesContent as string)[0]).toEqual(page1);
    });

    // Review follow-up: applyCover writes the full record (title + pagesContent) via
    // updateSpellFull, so it must also leave hasChanges/saveStatus coherent afterwards --
    // otherwise the Save button stays enabled even though there is nothing left to save.
    it('resets hasChanges/shows "saved" after a cover save, keeping the Save button honest', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.change(screen.getByTestId('spell-edit-title-input'), { target: { value: 'Renamed while uploading cover' } });
      expect(screen.getByTestId('spell-edit-save-btn')).not.toBeDisabled();

      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      const file = new File(['x'], 'cover.png', { type: 'image/png' });
      const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => expect(updateSpellFull).toHaveBeenCalled());
      // The in-memory title WAS included in this write (updateSpellFull is a full-record
      // write) -- so the pending edit is no longer unsaved, and the button reflects that.
      const call = vi.mocked(updateSpellFull).mock.calls[0][2];
      expect(call.title).toBe('Renamed while uploading cover');
      await waitFor(() => expect(screen.getByTestId('spell-edit-save-btn')).toBeDisabled());
    });
  });
});
