import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { AudioCacheManager } from '../index';
import { AUDIO_CACHE_AUTO_CLEANUP_KEY } from '../../../../db/audioCache';

const getSpellsFromDBMock = vi.fn();
vi.mock('../../../../db', () => ({
  getSpellsFromDB: (...args: unknown[]) => getSpellsFromDBMock(...args),
}));

const getAudioCacheSummaryMock = vi.fn();
const clearAllAudioCacheMock = vi.fn();
const clearSpellAudioCacheMock = vi.fn();
const clearAudioCacheForVoiceMock = vi.fn();
vi.mock('../../../../db/audioCache', async () => {
  const actual = await vi.importActual<typeof import('../../../../db/audioCache')>('../../../../db/audioCache');
  return {
    ...actual,
    getAudioCacheSummary: () => getAudioCacheSummaryMock(),
    clearAllAudioCache: () => clearAllAudioCacheMock(),
    clearSpellAudioCache: (...args: unknown[]) => clearSpellAudioCacheMock(...args),
    clearAudioCacheForVoice: (...args: unknown[]) => clearAudioCacheForVoiceMock(...args),
  };
});

const twoSpellSummary = {
  totalBytes: 300,
  bySpell: {
    'spell-1': { totalBytes: 200, byVoice: { alice: 150, bob: 50 }, lastAccessed: 1700000000000 },
    'spell-2': { totalBytes: 100, byVoice: { alice: 100 }, lastAccessed: 0 },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  getSpellsFromDBMock.mockResolvedValue([
    { id: 'spell-1', title: 'The Dragon Tale' },
    // spell-2 deliberately has no matching spell record, to cover the "orphaned cache
    // entry" fallback (e.g. data from before TCORE-118 wired cache cleanup into spell
    // deletion).
  ]);
  getAudioCacheSummaryMock.mockResolvedValue(twoSpellSummary);
  clearAllAudioCacheMock.mockResolvedValue(undefined);
  clearSpellAudioCacheMock.mockResolvedValue(undefined);
  clearAudioCacheForVoiceMock.mockResolvedValue(undefined);
});

const renderManager = () => renderWithProviders(<AudioCacheManager />, {
  preloadedState: { session: { logged: true, userData: { id: 'user-1', loader: false } } },
});

describe('AudioCacheManager', () => {
  it('shows the total cache size and a row per spell, sorted largest first', async () => {
    renderManager();

    await waitFor(() => expect(screen.getByTestId('audio-cache-total')).toHaveTextContent('300 B'));
    const rows = screen.getAllByTestId(/^audio-cache-spell-/);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('data-testid', 'audio-cache-spell-spell-1');
    expect(rows[0]).toHaveTextContent('The Dragon Tale');
    // spell-2 has no matching spell record -- falls back to the generic "untitled" label
    // instead of crashing or showing a blank title.
    expect(rows[1]).toHaveTextContent('Untitled');
  });

  it('shows the empty state when nothing is cached', async () => {
    getAudioCacheSummaryMock.mockResolvedValue({ totalBytes: 0, bySpell: {} });
    renderManager();

    await waitFor(() => expect(screen.getByTestId('audio-cache-empty')).toBeInTheDocument());
    expect(screen.queryByTestId(/^audio-cache-spell-/)).not.toBeInTheDocument();
  });

  it('clears the whole cache after confirming, then reloads and shows a success toast', async () => {
    const { store } = renderManager();
    await waitFor(() => screen.getByTestId('audio-cache-clear-all-btn'));

    fireEvent.click(screen.getByTestId('audio-cache-clear-all-btn'));
    fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

    await waitFor(() => expect(clearAllAudioCacheMock).toHaveBeenCalled());
    expect(store.getState().apiResponses.responses[0]).toMatchObject({ type: 'success' });
    // reload() re-fetches the summary -- called once on mount, once after clearing.
    expect(getAudioCacheSummaryMock).toHaveBeenCalledTimes(2);
  });

  it('does not clear anything when the confirm modal is cancelled', async () => {
    renderManager();
    await waitFor(() => screen.getByTestId('audio-cache-clear-all-btn'));

    fireEvent.click(screen.getByTestId('audio-cache-clear-all-btn'));
    fireEvent.click(screen.getByTestId('delete-confirm-cancel-btn'));

    expect(clearAllAudioCacheMock).not.toHaveBeenCalled();
  });

  it('clears one spell\'s audio (all voices) after confirming, scoped to that spell only', async () => {
    renderManager();
    await waitFor(() => screen.getByTestId('audio-cache-clear-spell-spell-1-btn'));

    fireEvent.click(screen.getByTestId('audio-cache-clear-spell-spell-1-btn'));
    expect(screen.getByText('Clear audio for "The Dragon Tale"?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

    await waitFor(() => expect(clearSpellAudioCacheMock).toHaveBeenCalledWith('spell-1'));
    expect(clearSpellAudioCacheMock).not.toHaveBeenCalledWith('spell-2');
  });

  // Nit fix follow-up: clearAudioCacheForVoice used to fire straight from the click, unlike
  // every other destructive action on this screen -- gated behind the same DeleteConfirmModal
  // now, for consistency.
  it('clears a single voice for a spell after confirming, scoped to that voice only', async () => {
    const { store } = renderManager();
    await waitFor(() => screen.getByTestId('audio-cache-clear-voice-spell-1-alice-btn'));

    fireEvent.click(screen.getByTestId('audio-cache-clear-voice-spell-1-alice-btn'));
    expect(screen.getByText('Clear "alice" audio for "The Dragon Tale"?')).toBeInTheDocument();
    expect(clearAudioCacheForVoiceMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));

    await waitFor(() => expect(clearAudioCacheForVoiceMock).toHaveBeenCalledWith('spell-1', 'alice'));
    expect(clearAudioCacheForVoiceMock).not.toHaveBeenCalledWith('spell-1', 'bob');
    expect(store.getState().apiResponses.responses[0]).toMatchObject({ type: 'success' });
  });

  it('does not clear a voice when its confirm modal is cancelled', async () => {
    renderManager();
    await waitFor(() => screen.getByTestId('audio-cache-clear-voice-spell-1-alice-btn'));

    fireEvent.click(screen.getByTestId('audio-cache-clear-voice-spell-1-alice-btn'));
    fireEvent.click(screen.getByTestId('delete-confirm-cancel-btn'));

    expect(clearAudioCacheForVoiceMock).not.toHaveBeenCalled();
  });

  it('persists the auto-cleanup toggle to localStorage under the shared key', async () => {
    renderManager();
    await waitFor(() => screen.getByRole('switch'));

    expect(localStorage.getItem(AUDIO_CACHE_AUTO_CLEANUP_KEY)).toBeNull();
    fireEvent.click(screen.getByRole('switch'));
    expect(localStorage.getItem(AUDIO_CACHE_AUTO_CLEANUP_KEY)).toBe('true');
  });

  it('starts the toggle already on when the setting was previously enabled', async () => {
    localStorage.setItem(AUDIO_CACHE_AUTO_CLEANUP_KEY, 'true');
    renderManager();

    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'));
  });
});
