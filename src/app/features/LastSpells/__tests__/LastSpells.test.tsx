import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { LastSpells } from '../index';
import * as db from '../../../../db';
import { invalidateSpellList, coverFrameChanged } from '../../../../store/spellReaderSlice';
import { toggleQuickStartFilter } from '../../../../store/altarSlice';

// The detail modal loads the spell on its own; a stub is enough to see which spell a card opened.
vi.mock('../../../components/Modals/SpellDetailModal', () => ({
  SpellDetailModal: ({ spellId, show }: { spellId: string | null; show: boolean }) =>
    show ? <div data-testid="spell-detail-modal-stub">{spellId}</div> : null,
}));

const mockDoc = {
  id: 'doc-1',
  title: 'Sample Book',
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

describe('LastSpells', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('shows a skeleton in every place of the row while loading', () => {
    vi.spyOn(db, 'getSpellsFromDB').mockReturnValue(new Promise(() => {}));
    renderWithProviders(<LastSpells />, { store: loggedStore() });
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons.length).toBe(7);
  });

  // A row of its own for the skeletons spread out a second time when the spells arrived.
  it('fills the loading row with the spells, instead of putting up another one', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<LastSpells />, { store: loggedStore() });
    const row = screen.getByTestId('last-spells');
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(7);
    await screen.findByTestId('spell-card-doc-1');
    expect(screen.getByTestId('last-spells')).toBe(row);
  });

  it('renders nothing when there are no documents', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([]);
    const { container } = renderWithProviders(<LastSpells />, { store: loggedStore() });
    // Wait for loading to finish — component returns null, nothing should be in the DOM
    await vi.waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  // The quick start's filters: with "in progress" on, only the spells being read.
  it('lists only the spells in progress when the altar is set to', async () => {
    const reading = { ...mockDoc, id: 'doc-2', title: 'Being read', progress: { currentPage: 3, pagesProgress: [], lastReadSentenceIndex: 0 } };
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc, reading] as never);
    const store = loggedStore();
    store.dispatch(toggleQuickStartFilter('inProgress'));
    renderWithProviders(<LastSpells />, { store });
    await screen.findByTestId('spell-card-doc-2');
    expect(screen.queryByTestId('spell-card-doc-1')).toBeNull();
  });

  it('shows document cards when documents exist', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<LastSpells />, { store: loggedStore() });
    expect(await screen.findByTestId('spell-card-doc-1')).toBeInTheDocument();
  });

  it('opens the spell detail modal when a card is clicked, instead of navigating', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<LastSpells />, { store: loggedStore() });
    expect(screen.queryByTestId('spell-detail-modal-stub')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('spell-card-doc-1'));
    expect(screen.getByTestId('spell-detail-modal-stub')).toHaveTextContent('doc-1');
  });

  // Changes saved from the detail modal (a cover frame, a cover) refresh every list; the
  // list going back to its skeleton would unmount the modal it's showing.
  it('keeps the open detail modal (and the cards) while the list refetches', async () => {
    const getSpells = vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    const store = loggedStore();
    renderWithProviders(<LastSpells />, { store });
    fireEvent.click(await screen.findByTestId('spell-card-doc-1'));
    expect(screen.getByTestId('spell-detail-modal-stub')).toBeInTheDocument();

    // A refetch that hasn't come back yet.
    getSpells.mockReturnValue(new Promise(() => {}));
    act(() => { store.dispatch(invalidateSpellList()); });
    expect(screen.getByTestId('spell-detail-modal-stub')).toBeInTheDocument();
    expect(screen.getByTestId('spell-card-doc-1')).toBeInTheDocument();
    expect(screen.queryByTestId('skeleton-card')).not.toBeInTheDocument();
  });

  it('applies a cover frame picked from the detail to its card in place, without refetching', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:cover');
    const getSpells = vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([{ ...mockDoc, cover: new Blob(['x']) }] as never);
    const store = loggedStore();
    renderWithProviders(<LastSpells />, { store });
    await screen.findByTestId('spell-card-doc-1');
    expect(screen.queryByTestId('cover-frame-corner')).not.toBeInTheDocument();
    const reads = getSpells.mock.calls.length;
    act(() => { store.dispatch(coverFrameChanged({ spellId: 'doc-1', coverFrameId: 'grimoire' })); });
    expect(screen.getAllByTestId('cover-frame-corner').length).toBeGreaterThan(0);
    expect(getSpells.mock.calls.length).toBe(reads);
  });

  it('fills the row with empty spells when there are fewer spells than places', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<LastSpells />, { store: loggedStore() });
    await screen.findByTestId('spell-card-doc-1');
    expect(screen.getAllByTestId('last-spells-place')).toHaveLength(7);
    expect(screen.getAllByTestId(/^last-spells-empty-/)).toHaveLength(6);
  });

  it('a spell in the front row opens; one behind it is brought to the center first', async () => {
    const older = (id: string, ago: number) => ({ ...mockDoc, id, title: id, createdAt: new Date(new Date(mockDoc.createdAt).getTime() - ago).toISOString() });
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc, older('doc-2', 1000), older('doc-3', 2000)] as never);
    renderWithProviders(<LastSpells />, { store: loggedStore() });
    // doc-3 is two places out, behind the front row.
    fireEvent.click(await screen.findByTestId('spell-card-doc-3'));
    expect(screen.queryByTestId('spell-detail-modal-stub')).not.toBeInTheDocument();
    // doc-2 sits beside the centered spell, in the front row.
    fireEvent.click(screen.getByTestId('spell-card-doc-2'));
    expect(screen.getByTestId('spell-detail-modal-stub')).toHaveTextContent('doc-2');
  });
});

