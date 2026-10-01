import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { PdfUploadQueue } from '../index';
import { Routes, Route } from 'react-router-dom';
import { enqueueUpload, setUploadDone } from '../../../../store/spellUploadSlice';

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

  it('hides panel when close button is clicked', () => {
    const store = makeStore();
    store.dispatch(makeQueuedJob('job-4'));
    renderWithProviders(<PdfUploadQueue />, { store });
    fireEvent.click(screen.getByTestId('upload-queue-close'));
    expect(screen.queryByTestId('upload-queue')).not.toBeInTheDocument();
  });

  describe('a finished job', () => {
    const renderDone = () => {
      const store = makeStore();
      store.dispatch(makeQueuedJob('job-done'));
      store.dispatch(setUploadDone({ id: 'job-done', resultDocId: 'spell-9' }));
      renderWithProviders(
        <Routes>
          <Route path="/" element={<PdfUploadQueue />} />
          <Route path="/spell/:id" element={<div data-testid="spell-page" />} />
        </Routes>,
        { store },
      );
      return store;
    };

    it('opens the created spell when its row is clicked', () => {
      renderDone();
      fireEvent.click(screen.getByTestId('upload-job-job-done'));
      expect(screen.getByTestId('spell-page')).toBeInTheDocument();
    });

    it('its close button only dismisses it, without opening the spell', () => {
      const store = renderDone();
      fireEvent.click(screen.getByTestId('dismiss-job-job-done'));
      expect(screen.queryByTestId('spell-page')).not.toBeInTheDocument();
      expect(store.getState().spellUpload.queue).toHaveLength(0);
    });
  });
});

