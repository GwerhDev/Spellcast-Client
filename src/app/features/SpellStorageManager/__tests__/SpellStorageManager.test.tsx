import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { act } from '@testing-library/react';
import { SpellStorageManager } from '../index';
import { setSpellFile } from '../../../../store/spellReaderSlice';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const getSpellsFromDBMock = vi.fn();
const resetSpellProgressMock = vi.fn();
const resetAllSpellProgressMock = vi.fn();
vi.mock('../../../../db', () => ({
  getSpellsFromDB: (...args: unknown[]) => getSpellsFromDBMock(...args),
  resetSpellProgress: (...args: unknown[]) => resetSpellProgressMock(...args),
  resetAllSpellProgress: (...args: unknown[]) => resetAllSpellProgressMock(...args),
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
    { id: 'spell-1', title: 'The Dragon Tale', pagesContent: 'x'.repeat(1000), originalPagesContent: undefined, cover: undefined,
      progress: { currentPage: 4, pagesProgress: [], lastReadSentenceIndex: 2 } },
    { id: 'spell-2', title: 'Empty Spell', pagesContent: '', originalPagesContent: undefined, cover: undefined,
      progress: { currentPage: 0, pagesProgress: [], lastReadSentenceIndex: 0 } },
  ]);
  resetSpellProgressMock.mockResolvedValue(undefined);
  resetAllSpellProgressMock.mockResolvedValue(2);
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

  describe('reading progress', () => {
    it('shows where each spell was left, with a reset only for the ones started', async () => {
      renderManager();
      await waitFor(() => screen.getByTestId('spell-storage-progress-spell-1'));
      expect(screen.getByTestId('spell-storage-progress-spell-1')).toHaveTextContent('Page 4');
      expect(screen.getByTestId('spell-storage-progress-spell-2')).toHaveTextContent('Not started');
      expect(screen.getByTestId('spell-storage-reset-progress-spell-1-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('spell-storage-reset-progress-spell-2-btn')).not.toBeInTheDocument();
    });

    it("resets one spell after confirming (a 'Reset', not a 'Delete'), then refreshes every list", async () => {
      const { store } = renderManager();
      await waitFor(() => screen.getByTestId('spell-storage-reset-progress-spell-1-btn'));
      const listVersion = store.getState().spellReader.listVersion;

      fireEvent.click(screen.getByTestId('spell-storage-reset-progress-spell-1-btn'));
      expect(screen.getByTestId('delete-confirm-confirm-btn')).toHaveTextContent('Reset');
      fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

      await waitFor(() => expect(resetSpellProgressMock).toHaveBeenCalledWith('spell-1', 'user-1'));
      await waitFor(() => expect(store.getState().spellReader.listVersion).toBe(listVersion + 1));
      expect(resetAllSpellProgressMock).not.toHaveBeenCalled();
      expect(store.getState().apiResponses.responses[0]).toMatchObject({ type: 'success' });
    });

    it('takes the reset spell out of the player if it is the one loaded', async () => {
      const { store } = renderManager();
      await waitFor(() => screen.getByTestId('spell-storage-reset-progress-spell-1-btn'));
      act(() => { store.dispatch(setSpellFile({ id: 'spell-1', title: 'The Dragon Tale' })); });

      fireEvent.click(screen.getByTestId('spell-storage-reset-progress-spell-1-btn'));
      fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

      await waitFor(() => expect(store.getState().spellReader.spellId).toBeNull());
    });

    it('leaves a different loaded spell playing', async () => {
      const { store } = renderManager();
      await waitFor(() => screen.getByTestId('spell-storage-reset-progress-spell-1-btn'));
      act(() => { store.dispatch(setSpellFile({ id: 'spell-2', title: 'Empty Spell' })); });

      fireEvent.click(screen.getByTestId('spell-storage-reset-progress-spell-1-btn'));
      fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

      await waitFor(() => expect(resetSpellProgressMock).toHaveBeenCalled());
      expect(store.getState().spellReader.spellId).toBe('spell-2');
    });

    it('resets every spell at once after confirming, unloading whatever is loaded', async () => {
      const { store } = renderManager();
      await waitFor(() => screen.getByTestId('spell-storage-reset-all-progress-btn'));
      act(() => { store.dispatch(setSpellFile({ id: 'spell-2', title: 'Empty Spell' })); });

      fireEvent.click(screen.getByTestId('spell-storage-reset-all-progress-btn'));
      fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

      await waitFor(() => expect(resetAllSpellProgressMock).toHaveBeenCalledWith('user-1'));
      await waitFor(() => expect(store.getState().spellReader.spellId).toBeNull());
    });

    it('offers no reset at all when no spell has been started', async () => {
      getSpellsFromDBMock.mockResolvedValue([
        { id: 'spell-2', title: 'Empty Spell', pagesContent: '', progress: { currentPage: 0, pagesProgress: [], lastReadSentenceIndex: 0 } },
      ]);
      renderManager();
      await waitFor(() => screen.getByTestId('spell-storage-row-spell-2'));
      expect(screen.queryByTestId('spell-storage-reset-all-progress-btn')).not.toBeInTheDocument();
    });

    it('does not reset anything when the confirm modal is cancelled', async () => {
      renderManager();
      await waitFor(() => screen.getByTestId('spell-storage-reset-progress-spell-1-btn'));
      fireEvent.click(screen.getByTestId('spell-storage-reset-progress-spell-1-btn'));
      fireEvent.click(screen.getByTestId('delete-confirm-cancel-btn'));
      expect(resetSpellProgressMock).not.toHaveBeenCalled();
    });
  });
});
