import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { PdfUploadWorker } from '../index';
import { enqueueUpload } from '../../../../store/pdfUploadSlice';

// pdfjs-dist requires DOMMatrix (not in jsdom)
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));
vi.mock('pdfjs-dist/build/pdf.worker?url', () => ({ default: '' }));

describe('PdfUploadWorker', () => {
  it('renders nothing', () => {
    const { container } = renderWithProviders(<PdfUploadWorker />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing even when queue has a job', () => {
    const store = makeStore();
    store.dispatch(enqueueUpload({ id: 'job-1', title: 'Test.pdf' } as never));
    const { container } = renderWithProviders(<PdfUploadWorker />, { store });
    expect(container.firstChild).toBeNull();
  });
});
