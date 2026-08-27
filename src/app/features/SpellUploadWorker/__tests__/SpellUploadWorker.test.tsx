import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SpellUploadWorker } from '../index';
import { enqueueUpload } from '../../../../store/spellUploadSlice';

// pdfjs-dist requires DOMMatrix (not in jsdom)
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      getPage: () => Promise.resolve({ getTextContent: () => Promise.resolve({ items: [{ str: 'hello' }] }) }),
    }),
  })),
  GlobalWorkerOptions: { workerSrc: '' },
}));
vi.mock('pdfjs-dist/build/pdf.worker?url', () => ({ default: '' }));

// Page rendering/cover extraction are pdf.js-canvas-heavy and irrelevant to this worker's
// own responsibility (routing what gets saved where) -- stubbed to plain pass-through data.
vi.mock('../../../../utils/pdfUtils', () => ({
  renderPageToCover: vi.fn(() => Promise.resolve(null)),
  extractPdfPages: vi.fn(() => Promise.resolve([{ type: 'doc', content: [] }])),
  injectCoverIntoPages: vi.fn((pages) => Promise.resolve(pages)),
  blobToDataUrl: vi.fn(() => Promise.resolve('data:image/png;base64,')),
}));

const saveSpellToDBMock = vi.fn<(payload: Record<string, unknown>) => Promise<string>>(() => Promise.resolve('new-spell-id'));
const updateSpellFullMock = vi.fn<(id: string, userId: string, updates: Record<string, unknown>) => Promise<void>>(() => Promise.resolve());
vi.mock('../../../../db', () => ({
  saveSpellToDB: (...args: [Record<string, unknown>]) => saveSpellToDBMock(...args),
  updateSpellFull: (...args: [string, string, Record<string, unknown>]) => updateSpellFullMock(...args),
}));

const setOriginalPdfMock = vi.fn<(spellId: string, blob: Blob) => Promise<void>>(() => Promise.resolve());
vi.mock('../../../../db/originalPdfs', () => ({
  setOriginalPdf: (...args: [string, Blob]) => setOriginalPdfMock(...args),
}));

const FAKE_PDF_DATA_URL = 'data:application/pdf;base64,AAAA';

const enqueue = (overrides: Partial<Parameters<typeof enqueueUpload>[0]> = {}) => enqueueUpload({
  id: 'job-1',
  title: 'Test',
  fileContent: FAKE_PDF_DATA_URL,
  saveOriginal: false,
  userId: 'user-1',
  ...overrides,
} as never);

beforeEach(() => {
  vi.clearAllMocks();
  saveSpellToDBMock.mockResolvedValue('new-spell-id');
  updateSpellFullMock.mockResolvedValue(undefined);
  setOriginalPdfMock.mockResolvedValue(undefined);
});

describe('SpellUploadWorker', () => {
  it('renders nothing', () => {
    const { container } = renderWithProviders(<SpellUploadWorker />);
    expect(container.firstChild).toBeNull();
  });

  it('never sends a pdf/originalPdf field to the spell record on creation (TCORE-90)', async () => {
    const store = makeStore();
    store.dispatch(enqueue({ saveOriginal: true } as never));
    renderWithProviders(<SpellUploadWorker />, { store });

    await waitFor(() => expect(saveSpellToDBMock).toHaveBeenCalled());
    const payload = saveSpellToDBMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('pdf');
    expect(payload).not.toHaveProperty('originalPdf');
  });

  it('creation path: saves the original PDF to the separate store only when saveOriginal is true', async () => {
    const store = makeStore();
    store.dispatch(enqueue({ saveOriginal: true } as never));
    renderWithProviders(<SpellUploadWorker />, { store });

    await waitFor(() => expect(setOriginalPdfMock).toHaveBeenCalledWith('new-spell-id', expect.anything()));
  });

  it('creation path: does not save an original PDF when saveOriginal is false', async () => {
    const store = makeStore();
    store.dispatch(enqueue({ saveOriginal: false } as never));
    renderWithProviders(<SpellUploadWorker />, { store });

    await waitFor(() => expect(saveSpellToDBMock).toHaveBeenCalled());
    expect(setOriginalPdfMock).not.toHaveBeenCalled();
  });

  it('replace-content path (targetDocId): always saves the original PDF to the separate store, and never on the record', async () => {
    const store = makeStore();
    store.dispatch(enqueue({ saveOriginal: false, targetDocId: 'existing-spell' } as never));
    renderWithProviders(<SpellUploadWorker />, { store });

    await waitFor(() => expect(updateSpellFullMock).toHaveBeenCalled());
    const payload = updateSpellFullMock.mock.calls[0][2] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('pdf');
    expect(payload).not.toHaveProperty('originalPdf');
    expect(setOriginalPdfMock).toHaveBeenCalledWith('existing-spell', expect.anything());
  });
});
