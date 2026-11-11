import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { QuickStart } from '../index';
import * as db from '../../../../db';
import { invalidateSpellList, coverFrameChanged } from '../../../../store/spellReaderSlice';
import { toggleQuickStartFilter, spellArriving, spellDeparting, spellLanded } from '../../../../store/altarSlice';
import { setSpellFile, resetSpellReader } from '../../../../store/spellReaderSlice';
import { mockMatchMedia } from '../../../../test/mockMatchMedia';

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

describe('QuickStart', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('shows a skeleton in every place of the row while loading', () => {
    vi.spyOn(db, 'getSpellsFromDB').mockReturnValue(new Promise(() => {}));
    renderWithProviders(<QuickStart />, { store: loggedStore() });
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons.length).toBe(7);
  });

  // A row of its own for the skeletons spread out a second time when the spells arrived.
  it('fills the loading row with the spells, instead of putting up another one', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<QuickStart />, { store: loggedStore() });
    const row = screen.getByTestId('quick-start');
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(7);
    await screen.findByTestId('spell-card-doc-1');
    expect(screen.getByTestId('quick-start')).toBe(row);
  });

  it('renders nothing when there are no documents', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([]);
    const { container } = renderWithProviders(<QuickStart />, { store: loggedStore() });
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
    renderWithProviders(<QuickStart />, { store });
    await screen.findByTestId('spell-card-doc-2');
    expect(screen.queryByTestId('spell-card-doc-1')).toBeNull();
  });

  it('shows document cards when documents exist', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<QuickStart />, { store: loggedStore() });
    expect(await screen.findByTestId('spell-card-doc-1')).toBeInTheDocument();
  });

  it('opens the spell detail modal when a card is clicked, instead of navigating', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<QuickStart />, { store: loggedStore() });
    expect(screen.queryByTestId('spell-detail-modal-stub')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('spell-card-doc-1'));
    expect(screen.getByTestId('spell-detail-modal-stub')).toHaveTextContent('doc-1');
  });

  // Changes saved from the detail modal (a cover frame, a cover) refresh every list; the
  // list going back to its skeleton would unmount the modal it's showing.
  it('keeps the open detail modal (and the cards) while the list refetches', async () => {
    const getSpells = vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    const store = loggedStore();
    renderWithProviders(<QuickStart />, { store });
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
    renderWithProviders(<QuickStart />, { store });
    await screen.findByTestId('spell-card-doc-1');
    expect(screen.queryByTestId('cover-frame-corner')).not.toBeInTheDocument();
    const reads = getSpells.mock.calls.length;
    act(() => { store.dispatch(coverFrameChanged({ spellId: 'doc-1', coverFrameId: 'grimoire' })); });
    expect(screen.getAllByTestId('cover-frame-corner').length).toBeGreaterThan(0);
    expect(getSpells.mock.calls.length).toBe(reads);
  });

  it('fills the row with empty spells when there are fewer spells than places', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc] as never);
    renderWithProviders(<QuickStart />, { store: loggedStore() });
    await screen.findByTestId('spell-card-doc-1');
    // Once the empty place the spell took over has faded out of the row.
    await waitFor(() => expect(screen.getAllByTestId('quick-start-place')).toHaveLength(7));
    expect(screen.getAllByTestId(/^quick-start-empty-/)).toHaveLength(6);
  });

  it('a spell in the front row opens; one behind it is brought to the center first', async () => {
    const older = (id: string, ago: number) => ({ ...mockDoc, id, title: id, createdAt: new Date(new Date(mockDoc.createdAt).getTime() - ago).toISOString() });
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc, older('doc-2', 1000), older('doc-3', 2000)] as never);
    renderWithProviders(<QuickStart />, { store: loggedStore() });
    // doc-3 is two places out, behind the front row.
    fireEvent.click(await screen.findByTestId('spell-card-doc-3'));
    expect(screen.queryByTestId('spell-detail-modal-stub')).not.toBeInTheDocument();
    // doc-2 sits beside the centered spell, in the front row.
    fireEvent.click(screen.getByTestId('spell-card-doc-2'));
    expect(screen.getByTestId('spell-detail-modal-stub')).toHaveTextContent('doc-2');
  });

  describe('the spell on the altar', () => {
    const other = { ...mockDoc, id: 'doc-2', title: 'Another book' };
    const box = { left: 40, top: 500, width: 120, height: 168, right: 160, bottom: 668, x: 40, y: 500, toJSON: () => ({}) };
    const atTheCards = () => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box as DOMRect);

    it("isn't in the row, and is back once it's dispelled", async () => {
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc, other] as never);
      const store = loggedStore();
      renderWithProviders(<QuickStart />, { store });
      await screen.findByTestId('spell-card-doc-1');
      act(() => { store.dispatch(setSpellFile({ id: 'doc-1', title: 'Sample Book' })); });
      // Gone at once, not faded out where it was: its cover is on its way to the altar.
      await act(async () => {});
      expect(screen.queryByTestId('spell-card-doc-1')).toBeNull();
      expect(screen.getByTestId('spell-card-doc-2')).toBeInTheDocument();
      act(() => { store.dispatch(resetSpellReader()); });
      expect(await screen.findByTestId('spell-card-doc-1')).toBeInTheDocument();
    });

    it('leaves the row as soon as it is dropped on the altar, before it has loaded; back if it never does', async () => {
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc, other] as never);
      const store = loggedStore();
      renderWithProviders(<QuickStart />, { store });
      await screen.findByTestId('spell-card-doc-1');
      act(() => { store.dispatch(spellArriving({ spellId: 'doc-1', via: 'drop', from: box })); });
      // At once: a card left fading there would show its cover again as its drag ends.
      await act(async () => {});
      expect(screen.queryByTestId('spell-card-doc-1')).toBeNull();
      act(() => { store.dispatch(spellLanded()); });
      expect(await screen.findByTestId('spell-card-doc-1')).toBeInTheDocument();
    });

    it('flies from its card to the altar when conjured another way', async () => {
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc, other] as never);
      const store = loggedStore();
      renderWithProviders(<QuickStart />, { store });
      await screen.findByTestId('spell-card-doc-1');
      atTheCards();
      act(() => { store.dispatch(setSpellFile({ id: 'doc-1', title: 'Sample Book' })); });
      expect(store.getState().altar.arrival).toMatchObject({ spellId: 'doc-1', via: 'flight', from: { left: 40, top: 500, width: 120, height: 168 } });
    });

    it("doesn't fly what's already on its way (dropped, or flown from its detail)", async () => {
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc, other] as never);
      const store = loggedStore();
      renderWithProviders(<QuickStart />, { store });
      await screen.findByTestId('spell-card-doc-1');
      atTheCards();
      const fromDetail = { left: 300, top: 100, width: 200, height: 280 };
      act(() => { store.dispatch(spellArriving({ spellId: 'doc-1', via: 'flight', from: fromDetail })); });
      act(() => { store.dispatch(setSpellFile({ id: 'doc-1', title: 'Sample Book' })); });
      expect(store.getState().altar.arrival?.from).toEqual(fromDetail);
    });

    describe('with reduced motion', () => {
      afterEach(() => { vi.unstubAllGlobals(); });

      it("doesn't fly it to the altar: it's just there, and its card just gone", async () => {
        vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc, other] as never);
        const store = loggedStore();
        renderWithProviders(<QuickStart />, { store });
        await screen.findByTestId('spell-card-doc-1');
        atTheCards();
        mockMatchMedia(true);
        act(() => { store.dispatch(setSpellFile({ id: 'doc-1', title: 'Sample Book' })); });
        expect(store.getState().altar.arrival).toBeNull();
        await act(async () => {});
        expect(screen.queryByTestId('spell-card-doc-1')).toBeNull();
      });
    });

    it('when dispelled, says where its card is back for it to fly there, and keeps it hidden until it has', async () => {
      vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([mockDoc, other] as never);
      const store = loggedStore();
      store.dispatch(setSpellFile({ id: 'doc-1', title: 'Sample Book' }));
      renderWithProviders(<QuickStart />, { store });
      await screen.findByTestId('spell-card-doc-2');
      atTheCards();
      act(() => {
        store.dispatch(resetSpellReader());
        store.dispatch(spellDeparting({ spellId: 'doc-1', from: { left: 400, top: 200, width: 80, height: 80 } }));
      });
      const card = await screen.findByTestId('spell-card-doc-1');
      expect(card.className).toMatch(/cardLifted/);
      // No cover to show: it flies with the altar's light, after a few frames looking for one.
      await waitFor(() => expect(store.getState().altar.departure?.to).toEqual({ left: 40, top: 500, width: 120, height: 168 }));
      act(() => { store.dispatch({ type: 'altar/spellReturned' }); });
      expect(screen.getByTestId('spell-card-doc-1').className).not.toMatch(/cardLifted/);
    });
  });
});
