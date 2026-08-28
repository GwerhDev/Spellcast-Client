import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SpellList } from '../index';
import * as db from '../../../../db';
import * as originalPdfsDb from '../../../../db/originalPdfs';

const mockDoc = {
  id: 'doc-1',
  title: 'Test Document',
  createdAt: new Date().toISOString(),
  pagesContent: null,
  cover: null,
  progress: null,
  userId: 'user-1',
};

const loggedStore = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  return store;
};

describe('SpellList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(originalPdfsDb, 'getAllOriginalPdfIds').mockResolvedValue(new Set());
  });

  it('shows skeleton cards while fetching', () => {
    // Never resolves — keeps isLoading=true
    vi.spyOn(db, 'getSpellsFromDB').mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SpellList />, { store: loggedStore() });
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons.length).toBe(10);
  });

  it('shows empty state when no documents', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([]);
    renderWithProviders(<SpellList />, { store: loggedStore() });
    expect(await screen.findByTestId('spell-list-empty')).toBeInTheDocument();
  });

  it('shows no-results message when query matches nothing', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<SpellList query="zzznomatch" />, { store: loggedStore() });
    expect(await screen.findByTestId('spell-list-no-results')).toBeInTheDocument();
  });

  describe('docFilter="pdf" (TCORE-90 -- derived from the dedicated store, not doc.pdf)', () => {
    it('keeps only spells present in getAllOriginalPdfIds, in a single batch read', async () => {
      const withPdf = { ...mockDoc, id: 'doc-1', title: 'Has PDF' };
      const withoutPdf = { ...mockDoc, id: 'doc-2', title: 'No PDF' };
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([withPdf, withoutPdf] as never);
      vi.spyOn(originalPdfsDb, 'getAllOriginalPdfIds').mockResolvedValue(new Set(['doc-1']));

      renderWithProviders(<SpellList docFilter="pdf" />, { store: loggedStore() });

      expect(await screen.findByTestId('spell-card-doc-1')).toBeInTheDocument();
      expect(screen.queryByTestId('spell-card-doc-2')).not.toBeInTheDocument();
      expect(originalPdfsDb.getAllOriginalPdfIds).toHaveBeenCalledTimes(1);
    });
  });

  describe('onSelectableIdsChange (GrimoireLanding "select all")', () => {
    it('reports every id matching the current search/tab, not just the paginated subset', async () => {
      const docA = { ...mockDoc, id: 'doc-1', title: 'Alpha' };
      const docB = { ...mockDoc, id: 'doc-2', title: 'Beta' };
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([docA, docB] as never);
      const onSelectableIdsChange = vi.fn();

      renderWithProviders(<SpellList onSelectableIdsChange={onSelectableIdsChange} />, { store: loggedStore() });

      await screen.findByTestId('spell-card-doc-1');
      expect(onSelectableIdsChange).toHaveBeenLastCalledWith(['doc-1', 'doc-2']);
    });

    it('narrows to only the ids matching the search query', async () => {
      const docA = { ...mockDoc, id: 'doc-1', title: 'Alpha' };
      const docB = { ...mockDoc, id: 'doc-2', title: 'Beta' };
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([docA, docB] as never);
      const onSelectableIdsChange = vi.fn();

      renderWithProviders(<SpellList query="Alpha" onSelectableIdsChange={onSelectableIdsChange} />, { store: loggedStore() });

      await screen.findByTestId('spell-card-doc-1');
      expect(onSelectableIdsChange).toHaveBeenLastCalledWith(['doc-1']);
    });
  });
});
