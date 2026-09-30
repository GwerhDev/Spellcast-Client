import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { Routes, Route } from 'react-router-dom';
import { SpellDetailModal } from '../SpellDetailModal';
import * as db from '../../../../db';
import * as originalPdfsDb from '../../../../db/originalPdfs';
import { setSpellFile, setSpellInfo, setSpellLoaded } from '../../../../store/spellReaderSlice';

const mockDoc = {
  id: 'doc-1',
  title: 'My Book',
  createdAt: new Date().toISOString(),
  pagesContent: JSON.stringify([{}, {}, {}]),
  cover: null,
  progress: null,
  userId: 'user-1',
};

const loggedStore = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  return store;
};

describe('SpellDetailModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(originalPdfsDb, 'hasOriginalPdf').mockResolvedValue(false);
  });

  describe('PDF tag (TCORE-90 -- derived from the dedicated store, not doc.pdf)', () => {
    it('shows the PDF tag once hasOriginalPdf resolves true', async () => {
      vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
      vi.spyOn(originalPdfsDb, 'hasOriginalPdf').mockResolvedValue(true);
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });
      expect(await screen.findByTestId('spell-detail-modal-pdf-tag')).toBeInTheDocument();
    });

    it('does not show the PDF tag when no original PDF is stored', async () => {
      vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
      vi.spyOn(originalPdfsDb, 'hasOriginalPdf').mockResolvedValue(false);
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });
      await screen.findByTestId('spell-detail-modal-continue-btn');
      expect(screen.queryByTestId('spell-detail-modal-pdf-tag')).not.toBeInTheDocument();
    });
  });

  it("the title links to the spell's full detail route, closing the modal", async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
    const onClose = vi.fn();
    renderWithProviders(
      <Routes>
        <Route path="/" element={<SpellDetailModal spellId="doc-1" show onClose={onClose} />} />
        <Route path="/spell/:id" element={<div data-testid="spell-detail-route" />} />
      </Routes>,
      { store: loggedStore() },
    );
    fireEvent.click(await screen.findByTestId('spell-detail-modal-title-link'));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId('spell-detail-route')).toBeInTheDocument();
  });

  it("hides edit and delete for a spell outside the caster's grimoire", async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue({ ...mockDoc, userId: 'user-2' } as never);
    renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });
    expect(await screen.findByTestId('spell-detail-modal-continue-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('spell-detail-modal-edit-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('spell-detail-modal-delete-btn')).not.toBeInTheDocument();
  });

  it('shows the loader while the spell is being read', () => {
    vi.spyOn(db, 'getSpellById').mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });
    expect(screen.getByTestId('spell-detail-modal-loading')).toBeInTheDocument();
    expect(screen.getByTestId('spinner-logo')).toBeInTheDocument();
  });

  it('starts clean when reopened: never shows the previous spell while the next one loads', async () => {
    const getSpell = vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
    const store = loggedStore();
    const { rerender } = renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store });
    expect(await screen.findByTestId('spell-detail-modal-title-link')).toHaveTextContent('My Book');

    rerender(<SpellDetailModal spellId="doc-1" show={false} onClose={vi.fn()} />);
    getSpell.mockReturnValue(new Promise(() => {}));
    rerender(<SpellDetailModal spellId="doc-2" show onClose={vi.fn()} />);
    expect(screen.getByTestId('spell-detail-modal-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('spell-detail-modal-title-link')).not.toBeInTheDocument();
  });

  describe('editing the cover', () => {
    it("offers editing the cover of the caster's own spell, which opens the cover modal", async () => {
      vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });
      fireEvent.click(await screen.findByTestId('spell-detail-modal-edit-cover-btn'));
      expect(screen.getByTestId('spell-cover-modal')).toBeInTheDocument();
      expect(screen.getByTestId('cover-frame-options')).toBeInTheDocument();
    });

    it("isn't offered for a spell outside the caster's grimoire", async () => {
      vi.spyOn(db, 'getSpellById').mockResolvedValue({ ...mockDoc, userId: 'user-2' } as never);
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });
      await screen.findByTestId('spell-detail-modal-continue-btn');
      expect(screen.queryByTestId('spell-detail-modal-edit-cover-btn')).not.toBeInTheDocument();
    });

    it('picking a frame saves it and shows it, without reading the spell again', async () => {
      const read = vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
      const save = vi.spyOn(db, 'updateSpellCoverFrame').mockResolvedValue(undefined);
      const store = loggedStore();
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store });
      fireEvent.click(await screen.findByTestId('spell-detail-modal-edit-cover-btn'));
      const reads = read.mock.calls.length;
      fireEvent.click(screen.getByTestId('cover-frame-option-none'));
      await waitFor(() => expect(save).toHaveBeenCalledWith('doc-1', 'user-1', null));
      await waitFor(() => expect(screen.getByTestId('cover-frame-option-none').className).toMatch(/optionSelected/));
      expect(read.mock.calls.length).toBe(reads);
    });

    it('while a frame saves, shows a spinner on that option and disables the others', async () => {
      vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
      let finish: () => void = () => {};
      vi.spyOn(db, 'updateSpellCoverFrame').mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });
      fireEvent.click(await screen.findByTestId('spell-detail-modal-edit-cover-btn'));
      fireEvent.click(screen.getByTestId('cover-frame-option-none'));
      expect(await screen.findByTestId('cover-frame-option-none-saving')).toBeInTheDocument();
      expect(screen.getByTestId('cover-frame-option-default')).toBeDisabled();
      expect(screen.queryByTestId('spell-cover-modal-busy')).not.toBeInTheDocument();
      await act(async () => { finish(); });
      expect(screen.queryByTestId('cover-frame-option-none-saving')).not.toBeInTheDocument();
      expect(screen.getByTestId('cover-frame-option-default')).not.toBeDisabled();
    });
  });

  describe("the spell's playback controls", () => {
    it('loads a spell that is not loaded into the player, paused, without navigating', async () => {
      vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
      const store = loggedStore();
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store });
      fireEvent.click(await screen.findByTestId('spell-transport-mount'));
      expect(store.getState().spellReader.spellId).toBe('doc-1');
      expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(false);
      expect(screen.getByTestId('spell-transport-toggle')).toBeInTheDocument();
    });

    it('once loaded, plays/pauses, turns its pages, and unloads', async () => {
      vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
      const store = loggedStore();
      store.dispatch(setSpellFile({ id: 'doc-1', title: 'My Book', userId: 'user-1' }));
      store.dispatch(setSpellInfo({ totalPages: 3 }));
      store.dispatch(setSpellLoaded(true));
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store });
      const toggleSeq = store.getState().browserPlayer.toggleSeq;
      fireEvent.click(await screen.findByTestId('spell-transport-toggle'));
      expect(store.getState().browserPlayer.toggleSeq).toBe(toggleSeq + 1);
      fireEvent.click(screen.getByTestId('spell-transport-next'));
      expect(store.getState().spellReader.currentPage).toBe(2);
      fireEvent.click(screen.getByTestId('spell-transport-previous'));
      expect(store.getState().spellReader.currentPage).toBe(1);
      fireEvent.click(screen.getByTestId('spell-transport-unmount'));
      expect(store.getState().spellReader.spellId).toBeNull();
      expect(screen.getByTestId('spell-transport-mount')).toBeInTheDocument();
    });
  });

  it("'Open in the reader' only navigates: it never turns autoplay on", async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
    const store = loggedStore();
    renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store });
    fireEvent.click(await screen.findByTestId('spell-detail-modal-continue-btn'));
    expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(false);
    expect(store.getState().audioPlayer.autoPlayOnLoad).toBe(false);
  });

  it('renders nothing when show is false', () => {
    renderWithProviders(<SpellDetailModal spellId="doc-1" show={false} onClose={vi.fn()} />, { store: loggedStore() });
    expect(screen.queryByTestId('spell-detail-modal-continue-btn')).not.toBeInTheDocument();
  });

  // Mirrors SpellDetail.test.tsx's equivalent page-level assertion — same testid suffixes
  // on both surfaces (page vs modal) as a guard against the two re-diverging visually.
  it('shows the continue/edit/delete action buttons once the document loads', async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
    renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });
    expect(await screen.findByTestId('spell-detail-modal-continue-btn')).toBeInTheDocument();
    expect(screen.getByTestId('spell-detail-modal-edit-btn')).toBeInTheDocument();
    expect(screen.getByTestId('spell-detail-modal-delete-btn')).toBeInTheDocument();
  });

  describe('metadata section', () => {
    it('shows description/author/language/tags when the spell has them', async () => {
      vi.spyOn(db, 'getSpellById').mockResolvedValue({
        ...mockDoc,
        description: 'A tale of dragons',
        author: 'Jane Doe',
        language: 'en',
        tags: ['fantasy', 'adventure'],
      } as never);
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });

      expect(await screen.findByTestId('spell-detail-modal-metadata')).toBeInTheDocument();
      expect(screen.getByTestId('spell-detail-modal-description')).toHaveTextContent('A tale of dragons');
      expect(screen.getByTestId('spell-detail-modal-author')).toHaveTextContent('Jane Doe');
      expect(screen.getByTestId('spell-detail-modal-language')).toHaveTextContent('en');
      expect(screen.getByTestId('spell-detail-modal-tags')).toHaveTextContent('fantasy');
      expect(screen.getByTestId('spell-detail-modal-tags')).toHaveTextContent('adventure');
    });

    it('omits the metadata section entirely when the spell has none of these fields', async () => {
      vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });

      await screen.findByTestId('spell-detail-modal-continue-btn');
      expect(screen.queryByTestId('spell-detail-modal-metadata')).not.toBeInTheDocument();
    });

    it('shows the author as a byline under the title even with no other metadata set, and omits the metadata block', async () => {
      vi.spyOn(db, 'getSpellById').mockResolvedValue({ ...mockDoc, author: 'Jane Doe' } as never);
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store: loggedStore() });

      expect(await screen.findByTestId('spell-detail-modal-author')).toHaveTextContent('Jane Doe');
      expect(screen.queryByTestId('spell-detail-modal-metadata')).not.toBeInTheDocument();
      expect(screen.queryByTestId('spell-detail-modal-description')).not.toBeInTheDocument();
      expect(screen.queryByTestId('spell-detail-modal-language')).not.toBeInTheDocument();
      expect(screen.queryByTestId('spell-detail-modal-tags')).not.toBeInTheDocument();
    });
  });

  it('dispatches invalidateSpellList after confirming delete', async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(mockDoc as never);
    vi.spyOn(db, 'deleteSpellFromDB').mockResolvedValue(undefined);
    const store = loggedStore();
    renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} />, { store });
    await screen.findByTestId('spell-detail-modal-delete-btn');
    expect(store.getState().spellReader.listVersion).toBe(0);

    fireEvent.click(screen.getByTestId('spell-detail-modal-delete-btn'));
    fireEvent.click(await screen.findByTestId('delete-confirm-confirm-btn'));

    await waitFor(() => expect(store.getState().spellReader.listVersion).toBe(1));
  });

  // Opened from a card, the card hands over its cover: it flies in and shows right away,
  // while only the details wait for the spell to be read (a big spell takes a while).
  describe('cover handed over by the card', () => {
    const cardCover = document.createElement('div');
    const origin = { rect: { top: 400, left: 60, width: 120, height: 180 }, coverUrl: 'blob:card-cover', element: cardCover };

    beforeEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      });
    });

    it("flies in and shows the card's cover before the spell has been read", async () => {
      vi.spyOn(db, 'getSpellById').mockReturnValue(new Promise(() => {}) as never);
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} origin={origin} />, { store: loggedStore() });

      // Still loading, and the cover isn't waiting for it: it has already taken off...
      expect(screen.getByTestId('spell-detail-modal-loading')).toBeInTheDocument();
      expect(screen.getByTestId('cover-flight')).toBeInTheDocument();
      // ...and once landed, the slot shows it, with only the details on the spinner.
      await waitFor(() => expect(screen.queryByTestId('cover-flight')).not.toBeInTheDocument());
      const slot = screen.getByTestId('spell-detail-modal-cover');
      expect(slot.className).not.toMatch(/coverAway/);
      expect(slot.querySelector('img')?.getAttribute('src')).toBe('blob:card-cover');
      expect(screen.getByTestId('spell-detail-modal-loading')).toBeInTheDocument();
    });

    // (The card's cover also bridges the one frame before that copy exists; jsdom runs that
    // effect in the same flush, so the frame itself can't be observed here.)
    it('switches to its own copy of the cover once the spell has been read', async () => {
      URL.createObjectURL = vi.fn(() => 'blob:modal-cover');
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(db, 'getSpellById').mockResolvedValue({ ...mockDoc, cover: new Blob(['x']) } as never);
      renderWithProviders(<SpellDetailModal spellId="doc-1" show onClose={vi.fn()} origin={origin} />, { store: loggedStore() });

      await screen.findByTestId('spell-detail-modal-continue-btn');
      const img = screen.getByTestId('spell-detail-modal-cover').querySelector('img');
      expect(img).not.toBeNull();
      await waitFor(() => expect(img?.getAttribute('src')).toBe('blob:modal-cover'));
    });
  });
});
