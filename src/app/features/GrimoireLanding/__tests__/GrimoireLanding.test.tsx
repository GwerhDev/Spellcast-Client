import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { GrimoireLanding } from '../index';
import * as db from '../../../../db';
import * as originalPdfsDb from '../../../../db/originalPdfs';

// pdfjs-dist requires DOMMatrix which jsdom doesn't implement — mock the component
vi.mock('../../../components/Start/ImportOption', () => ({
  ImportOption: () => null,
}));

const updateFromPdfMock = vi.fn();
vi.mock('../../../../hooks/useUpdateSpellsFromPdf', () => ({
  useUpdateSpellsFromPdf: () => updateFromPdfMock,
}));

const downloadMock = vi.fn();
vi.mock('../../../../hooks/useDownloadSpells', () => ({
  useDownloadSpells: () => ({ download: downloadMock, isDownloading: false }),
}));

const mockSpell = {
  id: 'spell-1',
  title: 'My Spell',
  createdAt: new Date().toISOString(),
  pagesContent: JSON.stringify([{}]),
  cover: null,
  progress: null,
  userId: 'user-1',
};

const mockSpell2 = { ...mockSpell, id: 'spell-2', title: 'Another Spell' };

const loggedStore = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  return store;
};

describe('GrimoireLanding', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([]);
    vi.spyOn(originalPdfsDb, 'getAllOriginalPdfIds').mockResolvedValue(new Set());
  });

  it('renders the grimoire container', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    expect(screen.getByTestId('grimoire-landing')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    expect(screen.getByTestId('grimoire-search')).toBeInTheDocument();
  });

  it('add-documents button is present', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    expect(screen.getByTestId('add-spells-btn')).toBeInTheDocument();
  });

  it('select-mode button is present', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    expect(screen.getByTestId('select-mode-btn')).toBeInTheDocument();
  });

  it('bulk bar is hidden initially', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    expect(screen.queryByTestId('bulk-bar')).toBeNull();
  });

  it('clicking select mode activates selection', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    fireEvent.click(screen.getByTestId('select-mode-btn'));
    expect(screen.getByTestId('select-mode-btn')).toBeInTheDocument();
  });

  it('clicking add-documents twice toggles import visibility', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    const btn = screen.getByTestId('add-spells-btn');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });

  it('search input updates on type', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    const input = screen.getByTestId('grimoire-search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(input.value).toBe('hello');
  });

  describe('select all / bulk bar always visible in selection mode', () => {
    beforeEach(() => {
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockSpell, mockSpell2] as never);
    });

    it('shows the bulk bar as soon as selection mode is entered, with nothing selected yet', async () => {
      renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
      await screen.findByTestId('spell-card-spell-1');
      fireEvent.click(screen.getByTestId('select-mode-btn'));

      expect(await screen.findByTestId('bulk-bar')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-delete-btn')).toBeDisabled();
      expect(screen.getByTestId('bulk-update-from-pdf-btn')).toBeDisabled();
    });

    it('select-all selects every listed spell; clicking again unselects them', async () => {
      renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
      await screen.findByTestId('spell-card-spell-1');
      fireEvent.click(screen.getByTestId('select-mode-btn'));
      await screen.findByTestId('bulk-bar');

      fireEvent.click(screen.getByTestId('select-all-btn'));
      expect(screen.getByTestId('bulk-count')).toHaveTextContent('2 selected');
      expect(screen.getByTestId('bulk-delete-btn')).not.toBeDisabled();

      fireEvent.click(screen.getByTestId('select-all-btn'));
      expect(screen.getByTestId('bulk-count')).toHaveTextContent('0 selected');
    });
  });

  describe('"Update from PDF" for the selected spells', () => {
    beforeEach(() => {
      vi.mocked(updateFromPdfMock).mockReset();
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockSpell] as never);
    });

    const selectFirstSpell = async () => {
      renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
      fireEvent.click(screen.getByTestId('select-mode-btn'));
      fireEvent.click(await screen.findByTestId('spell-card-spell-1'));
    };

    it('shows it alongside bulk delete once something is selected', async () => {
      await selectFirstSpell();
      expect(await screen.findByTestId('bulk-update-from-pdf-btn')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-delete-btn')).toBeInTheDocument();
    });

    it('asks first, then updates the selected spells from their PDF and clears the selection', async () => {
      updateFromPdfMock.mockResolvedValue({ queued: 1, skipped: 0 });
      await selectFirstSpell();

      fireEvent.click(await screen.findByTestId('bulk-update-from-pdf-btn'));
      expect(updateFromPdfMock).not.toHaveBeenCalled();
      fireEvent.click(await screen.findByTestId('bulk-update-from-pdf-confirm-btn'));

      await waitFor(() => expect(updateFromPdfMock).toHaveBeenCalledWith(['spell-1']));
      await waitFor(() => expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument());
    });
  });

  describe('downloading spells as .spell files', () => {
    beforeEach(() => {
      downloadMock.mockReset().mockResolvedValue(undefined);
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockSpell, mockSpell2] as never);
    });

    it('downloads the selected spells, asking first what to include', async () => {
      renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
      fireEvent.click(screen.getByTestId('select-mode-btn'));
      fireEvent.click(await screen.findByTestId('spell-card-spell-2'));
      fireEvent.click(screen.getByTestId('bulk-download-btn'));
      expect(downloadMock).not.toHaveBeenCalled();
      fireEvent.click(await screen.findByTestId('spell-export-confirm-btn'));
      await waitFor(() => expect(downloadMock).toHaveBeenCalledWith(['spell-2'], { includeSource: false, includeAudio: false }));
    });

    it('downloads the whole Grimoire, whatever is searched', async () => {
      renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
      fireEvent.change(screen.getByTestId('grimoire-search'), { target: { value: 'Another' } });
      fireEvent.click(screen.getByTestId('download-grimoire-btn'));
      fireEvent.click(await screen.findByTestId('spell-export-confirm-btn'));
      await waitFor(() => expect(downloadMock).toHaveBeenCalledWith(['spell-1', 'spell-2'], { includeSource: false, includeAudio: false }));
    });
  });
});
