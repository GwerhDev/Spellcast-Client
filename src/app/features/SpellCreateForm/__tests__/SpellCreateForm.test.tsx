import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellCreateForm } from '../index';
import type { PdfMetadata } from '../../../../utils/pdfUtils';

const getDocumentMock = vi.fn();
vi.mock('pdfjs-dist', () => ({
  getDocument: (...args: unknown[]) => getDocumentMock(...args),
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('pdfjs-dist/build/pdf.worker?url', () => ({ default: '' }));

vi.mock('../../../../app/components/Editors/SpellEditor', () => ({
  SpellEditor: () => null,
}));

const extractPdfMetadataMock = vi.fn<() => Promise<PdfMetadata>>(() => Promise.resolve({}));
vi.mock('../../../../utils/pdfUtils', () => ({
  emptyPageContent: { type: 'doc', content: [{ type: 'paragraph' }] },
  renderPageToCover: vi.fn(() => Promise.resolve(null)),
  extractPdfPages: vi.fn(() => Promise.resolve([{ type: 'doc', content: [] }])),
  injectCoverIntoPages: vi.fn((pages: unknown) => Promise.resolve(pages)),
  blobToDataUrl: vi.fn(() => Promise.resolve('data:image/png;base64,')),
  extractPdfMetadata: (...args: unknown[]) => extractPdfMetadataMock(...(args as [])),
}));

const saveSpellToDBMock = vi.fn<(payload: Record<string, unknown>) => Promise<string>>(() => Promise.resolve('new-spell-id'));
vi.mock('../../../../db', () => ({
  saveSpellToDB: (...args: [Record<string, unknown>]) => saveSpellToDBMock(...args),
}));

const setOriginalPdfMock = vi.fn<(spellId: string, blob: Blob) => Promise<void>>(() => Promise.resolve());
vi.mock('../../../../db/originalPdfs', () => ({
  setOriginalPdf: (...args: [string, Blob]) => setOriginalPdfMock(...args),
}));

const fakePdf = () => ({
  numPages: 1,
  getPage: () => Promise.resolve({ getTextContent: () => Promise.resolve({ items: [{ str: 'hello world' }] }) }),
});

beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  saveSpellToDBMock.mockResolvedValue('new-spell-id');
  setOriginalPdfMock.mockResolvedValue(undefined);
  extractPdfMetadataMock.mockResolvedValue({});
  getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakePdf()) });
});

const loggedInState = { session: { logged: true, userData: { id: 'user-1', loader: false } } };
const withFileContentState = {
  ...loggedInState,
  spell: {
    size: 1234,
    type: 'pdf',
    title: 'my-file',
    totalPages: 1,
    currentPage: 0,
    fileContent: 'data:application/pdf;base64,AAAA',
    isLoaded: true,
  },
};

describe('SpellCreateForm', () => {
  it('renders the form container', () => {
    renderWithProviders(<SpellCreateForm />);
    expect(screen.getByTestId('spell-create-form')).toBeInTheDocument();
  });

  it('renders the title input', () => {
    renderWithProviders(<SpellCreateForm />);
    expect(screen.getByTestId('spell-title-input')).toBeInTheDocument();
  });

  describe('handleSaveLocal (TCORE-90 -- no synthetic PDF is generated or stored)', () => {
    it('saves the spell without a pdf/originalPdf field, and without ever saving an original PDF when none was imported', async () => {
      renderWithProviders(<SpellCreateForm />, { preloadedState: loggedInState });
      fireEvent.change(screen.getByTestId('spell-title-input'), { target: { value: 'My Spell' } });
      fireEvent.click(screen.getByTestId('spell-create-save-btn'));

      await waitFor(() => expect(saveSpellToDBMock).toHaveBeenCalled());
      const payload = saveSpellToDBMock.mock.calls[0][0] as Record<string, unknown>;
      expect(payload).not.toHaveProperty('pdf');
      expect(payload).not.toHaveProperty('originalPdf');
      expect(setOriginalPdfMock).not.toHaveBeenCalled();
    });

    it('saves without touching the metadata section at all (all four fields optional)', async () => {
      renderWithProviders(<SpellCreateForm />, { preloadedState: loggedInState });
      fireEvent.change(screen.getByTestId('spell-title-input'), { target: { value: 'My Spell' } });
      fireEvent.click(screen.getByTestId('spell-create-save-btn'));

      await waitFor(() => expect(saveSpellToDBMock).toHaveBeenCalled());
      const payload = saveSpellToDBMock.mock.calls[0][0] as Record<string, unknown>;
      expect(payload.description).toBeUndefined();
      expect(payload.author).toBeUndefined();
      expect(payload.tags).toBeUndefined();
      expect(payload.language).toBeUndefined();
    });
  });

  describe('metadata section (TCORE-97)', () => {
    it('is collapsed by default and has no visible fields', () => {
      renderWithProviders(<SpellCreateForm />, { preloadedState: loggedInState });
      expect(screen.queryByTestId('spell-metadata-section')).not.toBeInTheDocument();
    });

    it('expands manually via the toggle, and fields typed in are saved (tags split on commas)', async () => {
      renderWithProviders(<SpellCreateForm />, { preloadedState: loggedInState });
      fireEvent.click(screen.getByTestId('spell-metadata-toggle'));
      fireEvent.change(screen.getByTestId('spell-metadata-description'), { target: { value: 'A tale' } });
      fireEvent.change(screen.getByTestId('spell-metadata-author'), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByTestId('spell-metadata-tags'), { target: { value: 'fantasy, adventure ,dragons' } });
      fireEvent.change(screen.getByTestId('spell-metadata-language'), { target: { value: 'en' } });
      fireEvent.change(screen.getByTestId('spell-title-input'), { target: { value: 'My Spell' } });
      fireEvent.click(screen.getByTestId('spell-create-save-btn'));

      await waitFor(() => expect(saveSpellToDBMock).toHaveBeenCalled());
      const payload = saveSpellToDBMock.mock.calls[0][0] as Record<string, unknown>;
      expect(payload.description).toBe('A tale');
      expect(payload.author).toBe('Jane Doe');
      expect(payload.tags).toEqual(['fantasy', 'adventure', 'dragons']);
      expect(payload.language).toBe('en');
    });

    it('prefills description/author/tags/language from the PDF and auto-expands the section', async () => {
      extractPdfMetadataMock.mockResolvedValue({
        title: 'PDF Title',
        description: 'A tale of dragons',
        author: 'Jane Doe',
        tags: ['fantasy', 'adventure'],
        language: 'en',
      });

      renderWithProviders(<SpellCreateForm />, { preloadedState: withFileContentState });

      await waitFor(() => expect(screen.getByTestId('spell-metadata-section')).toBeInTheDocument());
      expect(screen.getByTestId('spell-metadata-description')).toHaveValue('A tale of dragons');
      expect(screen.getByTestId('spell-metadata-author')).toHaveValue('Jane Doe');
      expect(screen.getByTestId('spell-metadata-tags')).toHaveValue('fantasy, adventure');
      expect(screen.getByTestId('spell-metadata-language')).toHaveValue('en');
    });

    it('does not auto-expand the section when the PDF has no metadata at all', async () => {
      extractPdfMetadataMock.mockResolvedValue({});

      renderWithProviders(<SpellCreateForm />, { preloadedState: withFileContentState });

      await waitFor(() => expect(extractPdfMetadataMock).toHaveBeenCalled());
      expect(screen.queryByTestId('spell-metadata-section')).not.toBeInTheDocument();
    });

    it('prefers the PDF Title over the filename', async () => {
      extractPdfMetadataMock.mockResolvedValue({ title: 'PDF Title' });

      renderWithProviders(<SpellCreateForm />, { preloadedState: withFileContentState });

      await waitFor(() => expect(screen.getByTestId('spell-title-input')).toHaveValue('PDF Title'));
    });

    it('keeps the filename as the title when the PDF has no Title metadata', async () => {
      extractPdfMetadataMock.mockResolvedValue({});

      renderWithProviders(<SpellCreateForm />, { preloadedState: withFileContentState });

      await waitFor(() => expect(extractPdfMetadataMock).toHaveBeenCalled());
      expect(screen.getByTestId('spell-title-input')).toHaveValue('my-file');
    });

    it('never overwrites a title the user already edited by hand, even once PDF metadata resolves later', async () => {
      let resolveMetadata: (meta: PdfMetadata) => void;
      extractPdfMetadataMock.mockReturnValue(new Promise((resolve) => { resolveMetadata = resolve; }));

      renderWithProviders(<SpellCreateForm />, { preloadedState: withFileContentState });

      await waitFor(() => expect(extractPdfMetadataMock).toHaveBeenCalled());
      fireEvent.change(screen.getByTestId('spell-title-input'), { target: { value: 'User Typed Title' } });

      resolveMetadata!({ title: 'PDF Title' });
      // Let any pending state updates from the metadata resolution flush.
      await waitFor(() => expect(screen.getByTestId('spell-title-input')).toHaveValue('User Typed Title'));
    });
  });
});
