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

// The spell's versions (useSpellVersions), as the editor sees them: a stand-in whose sealed state
// follows the editor's edits and seals, the repository itself tested on its own.
const versionsMock = {
  initiallyUnsealed: false,
  seal: vi.fn(() => Promise.resolve()),
  switchTo: vi.fn<(name: string) => Promise<void>>(() => Promise.resolve()),
  createVersion: vi.fn<(name: string) => Promise<void>>(() => Promise.resolve()),
  fusePlan: vi.fn(async (name: string) => ({ kind: 'fastForward' as const, theirsVersion: name, apply: async () => {} })),
  fuse: vi.fn<(plan: unknown, resolutions: unknown[]) => Promise<void>>(() => Promise.resolve()),
  sealChanges: vi.fn(async () => ({
    diff: { details: [], tags: { added: [], removed: [] }, cover: null, originalPages: null, pages: [] },
    from: { title: 'T', cover: null, originalPages: null, pages: [] }, to: { title: 'T', cover: null, originalPages: null, pages: [] },
    cover: { from: null, to: null }, readImage: async () => null,
  })),
  chronicle: vi.fn(() => Promise.resolve([
    { seal: { id: 's2', createdAt: '2026-10-19T18:40:00Z' }, first: false, pagesAdded: 0, pagesRemoved: 0, pagesChanged: 2, pagesMoved: 0, detailsChanged: false, coverChanged: false },
    { seal: { id: 's1', createdAt: '2026-10-19T17:00:00Z' }, first: true, pagesAdded: 0, pagesRemoved: 0, pagesChanged: 0, pagesMoved: 0, detailsChanged: false, coverChanged: false },
  ])),
};
vi.mock('../../../../hooks/useSpellVersions', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    useSpellVersions: () => {
      const [unsealed, setUnsealed] = React.useState(versionsMock.initiallyUnsealed);
      return {
        unsealed, current: 'source', names: ['source', 'draft'],
        refresh: () => Promise.resolve(),
        seal: async () => { await versionsMock.seal(); setUnsealed(false); },
        switchTo: async (name: string) => { await versionsMock.switchTo(name); setUnsealed(false); },
        createVersion: versionsMock.createVersion,
        fusePlan: versionsMock.fusePlan,
        fuse: versionsMock.fuse,
        chronicle: versionsMock.chronicle,
        sealChanges: versionsMock.sealChanges,
        unsealedChanges: versionsMock.sealChanges,
        markUnsealed: React.useCallback(() => setUnsealed(true), []),
      };
    },
  };
});

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
      <Route path="/spell/:id" element={<div data-testid="spell-page" />} />
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
      // write) -- so the pending edit is saved now ("Saved"), though not sealed: Save stays
      // there to seal it.
      const call = vi.mocked(updateSpellFull).mock.calls[0][2];
      expect(call.title).toBe('Renamed while uploading cover');
      expect(await screen.findByText(/^Saved$/)).toBeInTheDocument();
      expect(screen.getByTestId('spell-edit-save-btn')).not.toBeDisabled();
    });
  });

  describe('saving state', () => {
    const original = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'As in the PDF' }] }] };

    it('resetting a page saves it right away, leaving nothing to save', async () => {
      vi.mocked(getSpellById).mockResolvedValue({ ...mockDoc, originalPagesContent: JSON.stringify([original]) } as never);
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(await screen.findByTestId('page-list-reset-btn-0'));
      fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

      await waitFor(() => expect(updateSpellContent).toHaveBeenCalled());
      expect(JSON.parse(vi.mocked(updateSpellContent).mock.calls[0][2].pagesContent)).toEqual([original]);
      expect(screen.getByTestId('spell-edit-save-btn')).toBeDisabled();
    });

    // Saving the reset on its own would also save the other edits, without asking.
    it('with other edits not saved, a reset joins them instead of saving them', async () => {
      vi.mocked(getSpellById).mockResolvedValue({ ...mockDoc, originalPagesContent: JSON.stringify([original]) } as never);
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.change(screen.getByTestId('spell-edit-title-input'), { target: { value: 'Renamed, not saved' } });
      fireEvent.click(await screen.findByTestId('page-list-reset-btn-0'));
      fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

      await waitFor(() => expect(screen.queryByTestId('delete-confirm-confirm-btn')).not.toBeInTheDocument());
      expect(updateSpellContent).not.toHaveBeenCalled();
      expect(screen.getByTestId('spell-edit-save-btn')).not.toBeDisabled();
    });

    it('a reset that can\'t be saved (no title) stays a change to save, not lost', async () => {
      vi.mocked(getSpellById).mockResolvedValue({ ...mockDoc, title: '', originalPagesContent: JSON.stringify([original]) } as never);
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(await screen.findByTestId('page-list-reset-btn-0'));
      fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

      await waitFor(() => expect(screen.getByTestId('spell-edit-save-btn')).not.toBeDisabled());
      expect(updateSpellContent).not.toHaveBeenCalled();
    });

    it('adding a page is a change to save', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      expect(screen.getByTestId('spell-edit-save-btn')).toBeDisabled();
      fireEvent.click(screen.getByTestId('page-list-add-btn'));
      expect(screen.getByTestId('spell-edit-save-btn')).not.toBeDisabled();
    });

    it('leaving with unsaved edits asks first; leaving without saving goes', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.change(screen.getByTestId('spell-edit-title-input'), { target: { value: 'Renamed' } });
      fireEvent.click(screen.getByTestId('spell-edit-back-btn'));

      fireEvent.click(await screen.findByTestId('delete-confirm-cancel-btn'));
      expect(screen.getByTestId('spell-edit-form')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('spell-edit-back-btn'));
      fireEvent.click(await screen.findByTestId('delete-confirm-confirm-btn'));
      expect(await screen.findByTestId('spell-page')).toBeInTheDocument();
    });

    it('leaving with nothing to save just goes', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-edit-back-btn'));
      expect(await screen.findByTestId('spell-page')).toBeInTheDocument();
      expect(screen.queryByTestId('delete-confirm-confirm-btn')).not.toBeInTheDocument();
    });
  });

  describe('versions', () => {
    beforeEach(() => {
      versionsMock.initiallyUnsealed = false;
      versionsMock.seal.mockClear();
      versionsMock.switchTo.mockClear();
      versionsMock.createVersion.mockClear();
      versionsMock.fusePlan.mockClear();
      versionsMock.fuse.mockClear();
    });

    it('Save saves the edits and seals them; then there is nothing to save', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.change(screen.getByTestId('spell-edit-title-input'), { target: { value: 'Renamed' } });
      fireEvent.click(screen.getByTestId('spell-edit-save-btn'));
      await waitFor(() => expect(versionsMock.seal).toHaveBeenCalledTimes(1));
      expect(updateSpellContent).toHaveBeenCalled();
      await waitFor(() => expect(screen.getByTestId('spell-edit-save-btn')).toBeDisabled());
    });

    it('work saved but not sealed (autosaved): Save only seals it', async () => {
      versionsMock.initiallyUnsealed = true;
      renderForm();
      await screen.findByTestId('spell-edit-form');
      expect(screen.getByTestId('spell-edit-save-btn')).not.toBeDisabled();
      fireEvent.click(screen.getByTestId('spell-edit-save-btn'));
      await waitFor(() => expect(versionsMock.seal).toHaveBeenCalledTimes(1));
      expect(updateSpellContent).not.toHaveBeenCalled();
    });

    it('switches version right away when everything is sealed', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('version-selector'));
      fireEvent.click(screen.getByTestId('version-option-draft'));
      await waitFor(() => expect(versionsMock.switchTo).toHaveBeenCalledWith('draft'));
      expect(screen.queryByTestId('switch-version-modal')).not.toBeInTheDocument();
    });

    it('with changes not sealed, asks first: discarding switches without saving them', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.change(screen.getByTestId('spell-edit-title-input'), { target: { value: 'Unsealed' } });
      fireEvent.click(screen.getByTestId('version-selector'));
      fireEvent.click(screen.getByTestId('version-option-draft'));
      expect(await screen.findByTestId('switch-version-modal')).toBeInTheDocument();
      expect(versionsMock.switchTo).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('switch-version-discard'));
      await waitFor(() => expect(versionsMock.switchTo).toHaveBeenCalledWith('draft'));
      expect(updateSpellContent).not.toHaveBeenCalled();
      expect(versionsMock.seal).not.toHaveBeenCalled();
    });

    it('with changes not sealed, sealing first saves and seals them, then switches', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.change(screen.getByTestId('spell-edit-title-input'), { target: { value: 'Kept' } });
      fireEvent.click(screen.getByTestId('version-selector'));
      fireEvent.click(screen.getByTestId('version-option-draft'));
      fireEvent.click(await screen.findByTestId('switch-version-seal'));
      await waitFor(() => expect(versionsMock.switchTo).toHaveBeenCalledWith('draft'));
      expect(updateSpellContent).toHaveBeenCalled();
      expect(versionsMock.seal).toHaveBeenCalledTimes(1);
    });

    it('fuses another version into the current one, once its plan is confirmed', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('version-selector'));
      fireEvent.click(screen.getByTestId('version-fuse'));
      fireEvent.click(await screen.findByTestId('fuse-version-draft'));
      await waitFor(() => expect(versionsMock.fusePlan).toHaveBeenCalledWith('draft'));
      fireEvent.click(await screen.findByTestId('fuse-confirm'));
      await waitFor(() => expect(versionsMock.fuse).toHaveBeenCalledWith(expect.objectContaining({ kind: 'fastForward', theirsVersion: 'draft' }), []));
      await waitFor(() => expect(screen.queryByTestId('fuse-modal')).not.toBeInTheDocument());
    });

    it('cancelling a fusion writes nothing', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('version-selector'));
      fireEvent.click(screen.getByTestId('version-fuse'));
      fireEvent.click(await screen.findByTestId('fuse-version-draft'));
      await screen.findByTestId('fuse-confirm');
      fireEvent.click(screen.getByTestId('fuse-cancel'));
      await waitFor(() => expect(screen.queryByTestId('fuse-modal')).not.toBeInTheDocument());
      expect(versionsMock.fuse).not.toHaveBeenCalled();
    });

    it('with changes not sealed, asks to seal them before fusing', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.change(screen.getByTestId('spell-edit-title-input'), { target: { value: 'Unsealed' } });
      fireEvent.click(screen.getByTestId('version-selector'));
      fireEvent.click(screen.getByTestId('version-fuse'));
      expect(await screen.findByTestId('fuse-unsealed-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('fuse-modal')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('fuse-unsealed-seal'));
      await waitFor(() => expect(versionsMock.seal).toHaveBeenCalledTimes(1));
      expect(updateSpellContent).toHaveBeenCalled();
      expect(await screen.findByTestId('fuse-modal')).toBeInTheDocument();
    });

    it('makes a new version with the name given, never one already taken', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('version-selector'));
      fireEvent.click(screen.getByTestId('version-new'));
      const input = document.getElementById('new-version-name') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'draft' } });
      expect(screen.getByTestId('new-version-taken')).toBeInTheDocument();
      expect(screen.getByTestId('new-version-create')).toBeDisabled();
      fireEvent.change(input, { target: { value: ' revision ' } });
      fireEvent.click(screen.getByTestId('new-version-create'));
      await waitFor(() => expect(versionsMock.createVersion).toHaveBeenCalledWith('revision'));
    });

    it('shows the chronicle of the current version, newest first', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-edit-chronicle-btn'));
      const items = await screen.findAllByTestId('chronicle-item');
      expect(items).toHaveLength(2);
      expect(items[0].textContent).toContain('2 pages changed');
      expect(items[1].textContent).toContain('First seal');
    });

    it('opens what a seal changed from the chronicle', async () => {
      renderForm();
      await screen.findByTestId('spell-edit-form');
      fireEvent.click(screen.getByTestId('spell-edit-chronicle-btn'));
      fireEvent.click(await screen.findByTestId('chronicle-open-s2'));
      await waitFor(() => expect(versionsMock.sealChanges).toHaveBeenCalledWith('s2'));
      expect(await screen.findByTestId('diff-nothing')).toBeInTheDocument();
    });
  });
});
