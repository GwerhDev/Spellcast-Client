import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
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
});
