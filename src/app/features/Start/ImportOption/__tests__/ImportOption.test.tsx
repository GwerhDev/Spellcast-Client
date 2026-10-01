import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { setUploadDone } from '../../../../../store/spellUploadSlice';
import { renderWithProviders } from '../../../../../test/renderWithProviders';
import { ImportOption } from '../index';

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(() => ({ promise: Promise.resolve({ numPages: 3 }) })),
  GlobalWorkerOptions: { workerSrc: '' },
}));
vi.mock('pdfjs-dist/build/pdf.worker?url', () => ({ default: '' }));

const importFileMock = vi.fn();
vi.mock('../../../../../hooks/useSpellImport', () => ({
  useSpellImport: () => ({ importFile: (...args: unknown[]) => importFileMock(...args), isImporting: false }),
}));

const loggedInState = { session: { logged: true, userData: { id: 'user-1', loader: false } } };

const pdfFile = (name = 'book.pdf') => new File(['%PDF-1.4'], name, { type: 'application/pdf' });
const spellFile = (name = 'book.spell') => new File(['zip-bytes'], name, { type: 'application/octet-stream' });

const selectFiles = (files: File[]) => {
  const input = screen.getByTestId('import-option-file-input') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
};

beforeEach(() => {
  vi.clearAllMocks();
  importFileMock.mockResolvedValue(undefined);
});

describe('ImportOption', () => {
  it('accepts both .pdf and .spell in its file input', () => {
    renderWithProviders(<ImportOption />, { preloadedState: loggedInState });
    expect(screen.getByTestId('import-option-file-input')).toHaveAttribute('accept', '.pdf,.spell');
  });

  it('routes a selected .spell file straight to importFile, without entering the PDF review flow', async () => {
    renderWithProviders(<ImportOption />, { preloadedState: loggedInState });
    selectFiles([spellFile()]);

    await waitFor(() => expect(importFileMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'book.spell' })));
    expect(screen.queryByTestId('import-option-files')).not.toBeInTheDocument();
  });

  it('a single selected PDF still goes through the existing redux-backed review flow', async () => {
    renderWithProviders(<ImportOption />, { preloadedState: loggedInState });
    selectFiles([pdfFile()]);

    expect(await screen.findByTestId('import-option-files')).toBeInTheDocument();
    expect(importFileMock).not.toHaveBeenCalled();
  });

  it('a mixed PDF + .spell selection imports the .spell immediately and still routes the PDF normally', async () => {
    renderWithProviders(<ImportOption />, { preloadedState: loggedInState });
    selectFiles([pdfFile(), spellFile()]);

    await waitFor(() => expect(importFileMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'book.spell' })));
    expect(await screen.findByTestId('import-option-files')).toBeInTheDocument();
  });

  // Leaving (the modal closing, or the app opening the spell just created) must not leave
  // the picked PDF behind for the next import.
  it('drops a picked PDF when it goes away, so the next import starts empty', async () => {
    const { store, unmount } = renderWithProviders(<ImportOption />, { preloadedState: loggedInState });
    selectFiles([pdfFile()]);
    expect(await screen.findByTestId('import-option-files')).toBeInTheDocument();
    expect(store.getState().spell.isLoaded).toBe(true);

    unmount();
    expect(store.getState().spell.isLoaded).toBe(false);

    renderWithProviders(<ImportOption />, { store });
    expect(screen.getByTestId('import-option-dropzone')).toBeInTheDocument();
  });

  describe('several files', () => {
    const pickTwo = async () => {
      const result = renderWithProviders(<ImportOption />, { preloadedState: loggedInState });
      selectFiles([pdfFile('one.pdf')]);
      await screen.findByTestId('import-option-files');
      selectFiles([pdfFile('two.pdf')]);
      await waitFor(() => expect(screen.getAllByTestId('spell-create-input')).toHaveLength(2));
      return result;
    };

    it('offers adding more files before creating them all', async () => {
      await pickTwo();
      const addMore = screen.getByTestId('import-option-add-more');
      const createAll = screen.getByTestId('import-option-create-all');
      expect(addMore.compareDocumentPosition(createAll) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('creating them all keeps every file listed while they are created, one job each', async () => {
      const { store } = await pickTwo();
      fireEvent.click(screen.getByTestId('import-option-create-all'));
      await waitFor(() => expect(store.getState().spellUpload.queue).toHaveLength(2));
      expect(screen.getAllByTestId('spell-create-input')).toHaveLength(2);
    });

    it('once all are created, offers importing another file', async () => {
      const { store } = await pickTwo();
      fireEvent.click(screen.getByTestId('import-option-create-all'));
      await waitFor(() => expect(store.getState().spellUpload.queue).toHaveLength(2));
      act(() => { store.getState().spellUpload.queue.forEach((job: { id: string }) => store.dispatch(setUploadDone({ id: job.id, resultDocId: `spell-${job.id}` }))); });
      fireEvent.click(await screen.findByTestId('import-option-import-new'));
      expect(screen.getByTestId('import-option-dropzone')).toBeInTheDocument();
    });
  });
});

