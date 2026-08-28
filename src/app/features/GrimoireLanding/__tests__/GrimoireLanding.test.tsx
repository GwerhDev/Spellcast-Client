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

const refreshManyMock = vi.fn();
vi.mock('../../../../hooks/useRefreshSpellMetadataFromPdf', () => ({
  useRefreshSpellMetadataFromPdf: () => ({ refreshOne: vi.fn(), refreshMany: refreshManyMock, isRefreshing: false }),
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
      expect(screen.getByTestId('bulk-refresh-metadata-btn')).toBeDisabled();
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

  describe('bulk "update metadata from PDF" (TCORE-103)', () => {
    beforeEach(() => {
      vi.mocked(refreshManyMock).mockReset();
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockSpell] as never);
    });

    const selectFirstSpell = async () => {
      renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
      fireEvent.click(screen.getByTestId('select-mode-btn'));
      fireEvent.click(await screen.findByTestId('spell-card-spell-1'));
    };

    it('shows the bulk refresh-metadata action alongside bulk delete once something is selected', async () => {
      await selectFirstSpell();
      expect(await screen.findByTestId('bulk-refresh-metadata-btn')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-delete-btn')).toBeInTheDocument();
    });

    it('opens a confirm modal, and confirming calls refreshMany with the selected ids then clears the selection', async () => {
      refreshManyMock.mockResolvedValue({ updated: 1, skipped: 0 });
      await selectFirstSpell();

      fireEvent.click(await screen.findByTestId('bulk-refresh-metadata-btn'));
      fireEvent.click(await screen.findByTestId('bulk-refresh-metadata-confirm-btn'));

      await waitFor(() => expect(refreshManyMock).toHaveBeenCalledWith(['spell-1']));
      await waitFor(() => expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument());
    });
  });
});
