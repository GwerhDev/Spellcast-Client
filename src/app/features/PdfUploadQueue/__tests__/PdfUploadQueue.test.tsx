import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { PdfUploadQueue } from '../index';
import { enqueueUpload } from '../../../../store/pdfUploadSlice';

const makeQueuedJob = (id: string, title = 'Test.pdf') => enqueueUpload({ id, title } as never);

describe('PdfUploadQueue', () => {
  it('renders nothing when queue is empty', () => {
    const { container } = renderWithProviders(<PdfUploadQueue />);
    expect(container.firstChild).toBeNull();
  });

  it('shows upload queue when a job is present', () => {
    const store = makeStore();
    store.dispatch(makeQueuedJob('job-1'));
    renderWithProviders(<PdfUploadQueue />, { store });
    expect(screen.getByTestId('upload-queue')).toBeInTheDocument();
    expect(screen.getByTestId('upload-job-job-1')).toBeInTheDocument();
  });

  it('shows minimize button and collapses to chip', () => {
    const store = makeStore();
    store.dispatch(makeQueuedJob('job-2'));
    renderWithProviders(<PdfUploadQueue />, { store });
    fireEvent.click(screen.getByTestId('upload-queue-minimize'));
    expect(screen.getByTestId('upload-queue-chip')).toBeInTheDocument();
  });

  it('restores panel when chip is clicked', () => {
    const store = makeStore();
    store.dispatch(makeQueuedJob('job-3'));
    renderWithProviders(<PdfUploadQueue />, { store });
    fireEvent.click(screen.getByTestId('upload-queue-minimize'));
    fireEvent.click(screen.getByTestId('upload-queue-chip'));
    expect(screen.getByTestId('upload-job-job-3')).toBeInTheDocument();
  });
});
