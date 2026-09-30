import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SpellList } from '../index';
import * as db from '../../../../db';
import { invalidateSpellList } from '../../../../store/spellReaderSlice';
import * as originalPdfsDb from '../../../../db/originalPdfs';

// The detail modal loads the spell on its own; a stub is enough to see which spell a card opened.
vi.mock('../../../components/Modals/SpellDetailModal', () => ({
  SpellDetailModal: ({ spellId, show }: { spellId: string | null; show: boolean }) =>
    show ? <div data-testid="spell-detail-modal-stub">{spellId}</div> : null,
}));

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

  it('opens the spell detail modal when a card is clicked, instead of navigating', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<SpellList />, { store: loggedStore() });
    expect(screen.queryByTestId('spell-detail-modal-stub')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('spell-card-doc-1'));
    expect(screen.getByTestId('spell-detail-modal-stub')).toHaveTextContent('doc-1');
  });

  // Changes saved from the detail modal (a cover frame, a cover) refresh every list; the
  // list going back to its skeleton would unmount the modal it's showing.
  it('keeps the open detail modal (and the cards) while the list refetches', async () => {
    const getSpells = vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    const store = loggedStore();
    renderWithProviders(<SpellList />, { store });
    fireEvent.click(await screen.findByTestId('spell-card-doc-1'));
    expect(screen.getByTestId('spell-detail-modal-stub')).toBeInTheDocument();

    // A refetch that hasn't come back yet.
    getSpells.mockReturnValue(new Promise(() => {}));
    act(() => { store.dispatch(invalidateSpellList()); });
    expect(screen.getByTestId('spell-detail-modal-stub')).toBeInTheDocument();
    expect(screen.getByTestId('spell-card-doc-1')).toBeInTheDocument();
    expect(screen.queryByTestId('skeleton-card')).not.toBeInTheDocument();
  });
});
