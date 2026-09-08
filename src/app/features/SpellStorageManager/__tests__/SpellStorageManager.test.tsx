import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellStorageManager } from '../index';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const getSpellsFromDBMock = vi.fn();
vi.mock('../../../../db', () => ({
  getSpellsFromDB: (...args: unknown[]) => getSpellsFromDBMock(...args),
}));

const getAllOriginalPdfSizesMock = vi.fn();
const deleteOriginalPdfMock = vi.fn();
vi.mock('../../../../db/originalPdfs', () => ({
  getAllOriginalPdfSizes: () => getAllOriginalPdfSizesMock(),
  deleteOriginalPdf: (...args: unknown[]) => deleteOriginalPdfMock(...args),
}));

const getAudioCacheSummaryMock = vi.fn();
const clearSpellAudioCacheMock = vi.fn();
vi.mock('../../../../db/audioCache', () => ({
  getAudioCacheSummary: () => getAudioCacheSummaryMock(),
  clearSpellAudioCache: (...args: unknown[]) => clearSpellAudioCacheMock(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getSpellsFromDBMock.mockResolvedValue([
    { id: 'spell-1', title: 'The Dragon Tale', pagesContent: 'x'.repeat(1000), originalPagesContent: undefined, cover: undefined },
    { id: 'spell-2', title: 'Empty Spell', pagesContent: '', originalPagesContent: undefined, cover: undefined },
  ]);
  getAllOriginalPdfSizesMock.mockResolvedValue({ 'spell-1': 5000 });
  getAudioCacheSummaryMock.mockResolvedValue({
    totalBytes: 200,
    bySpell: { 'spell-1': { totalBytes: 200, byVoice: { alice: 200 }, lastAccessed: 0 } },
  });
  deleteOriginalPdfMock.mockResolvedValue(undefined);
  clearSpellAudioCacheMock.mockResolvedValue(undefined);
});

const renderManager = () => renderWithProviders(<SpellStorageManager />, {
  preloadedState: { session: { logged: true, userData: { id: 'user-1', loader: false } } },
});

describe('SpellStorageManager', () => {
  it('lists every spell with its content/PDF/audio breakdown, largest total first', async () => {
    renderManager();

    await waitFor(() => expect(screen.getByTestId('spell-storage-row-spell-1')).toBeInTheDocument());
    const rows = screen.getAllByTestId(/^spell-storage-row-/);
    // spell-1 has content (1000 bytes) + PDF (5000) + audio (200) = way more than spell-2's
    // near-empty content alone, so it must sort first despite the fixture order.
    expect(rows[0]).toHaveAttribute('data-testid', 'spell-storage-row-spell-1');
    expect(rows[0]).toHaveTextContent('The Dragon Tale');
    expect(rows[1]).toHaveTextContent('Empty Spell');
  });

  it('only shows a "Drop PDF" button for a spell that actually has one stored', async () => {
    renderManager();
    await waitFor(() => screen.getByTestId('spell-storage-row-spell-1'));

    expect(screen.getByTestId('spell-storage-drop-pdf-spell-1-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('spell-storage-drop-pdf-spell-2-btn')).not.toBeInTheDocument();
  });

  it('only shows a "Clear audio" button for a spell with cached audio', async () => {
    renderManager();
    await waitFor(() => screen.getByTestId('spell-storage-row-spell-1'));

    expect(screen.getByTestId('spell-storage-clear-audio-spell-1-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('spell-storage-clear-audio-spell-2-btn')).not.toBeInTheDocument();
  });

  it('drops the original PDF after confirming, scoped to that spell, then reloads', async () => {
    const { store } = renderManager();
    await waitFor(() => screen.getByTestId('spell-storage-drop-pdf-spell-1-btn'));

    fireEvent.click(screen.getByTestId('spell-storage-drop-pdf-spell-1-btn'));
    expect(screen.getByText('Drop the original PDF for "The Dragon Tale"?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

    await waitFor(() => expect(deleteOriginalPdfMock).toHaveBeenCalledWith('spell-1'));
    expect(clearSpellAudioCacheMock).not.toHaveBeenCalled();
    expect(store.getState().apiResponses.responses[0]).toMatchObject({ type: 'success' });
    expect(getAllOriginalPdfSizesMock).toHaveBeenCalledTimes(2); // once on mount, once after reload
  });

  it('clears a spell\'s audio after confirming -- the same action TCORE-118\'s AudioCacheManager uses', async () => {
    renderManager();
    await waitFor(() => screen.getByTestId('spell-storage-clear-audio-spell-1-btn'));

    fireEvent.click(screen.getByTestId('spell-storage-clear-audio-spell-1-btn'));
    fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

    await waitFor(() => expect(clearSpellAudioCacheMock).toHaveBeenCalledWith('spell-1'));
    expect(deleteOriginalPdfMock).not.toHaveBeenCalled();
  });

  it('does not drop or clear anything when the confirm modal is cancelled', async () => {
    renderManager();
    await waitFor(() => screen.getByTestId('spell-storage-drop-pdf-spell-1-btn'));

    fireEvent.click(screen.getByTestId('spell-storage-drop-pdf-spell-1-btn'));
    fireEvent.click(screen.getByTestId('delete-confirm-cancel-btn'));

    expect(deleteOriginalPdfMock).not.toHaveBeenCalled();
  });

  it('links out to the full audio cache manager', async () => {
    renderManager();
    await waitFor(() => screen.getByTestId('spell-storage-manage-audio-link'));

    fireEvent.click(screen.getByTestId('spell-storage-manage-audio-link'));
    expect(navigateMock).toHaveBeenCalledWith('/caster/settings/storage/local/audio-cache');
  });

  it('shows the empty state when the user has no spells at all', async () => {
    getSpellsFromDBMock.mockResolvedValue([]);
    getAudioCacheSummaryMock.mockResolvedValue({ totalBytes: 0, bySpell: {} });
    getAllOriginalPdfSizesMock.mockResolvedValue({});
    renderManager();

    await waitFor(() => expect(screen.getByTestId('spell-storage-empty')).toBeInTheDocument());
  });
});
