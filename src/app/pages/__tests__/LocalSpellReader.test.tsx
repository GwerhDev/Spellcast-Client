import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, makeStore } from '../../../test/renderWithProviders';
import { LocalSpellReader } from '../LocalSpellReader';
import { setSession } from '../../../store/sessionSlice';
import * as db from '../../../db';
import { resetSpellReader, setSpellFile } from '../../../store/spellReaderSlice';

// The reader itself needs browser APIs jsdom lacks; this page only decides what's loaded.
vi.mock('../../components/SpellReader', () => ({ SpellReader: () => <div data-testid="mock-spell-reader" /> }));

const loggedStore = () => {
  const store = makeStore();
  store.dispatch(setSession({ logged: true, userData: { id: 'user-1', username: 'Test', loader: false } }));
  return store;
};

const renderPage = (store = loggedStore()) =>
  renderWithProviders(
    <Routes>
      <Route path="/spell/:id/reader" element={<LocalSpellReader />} />
    </Routes>,
    { store, initialPath: '/spell/doc-1/reader' }
  );

describe('LocalSpellReader', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('shows a standardized (EmptyState) error panel when the spell is not found', async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(undefined);
    renderPage();

    expect(await screen.findByTestId('local-spell-reader-error')).toHaveTextContent('Spell not found.');
    expect(screen.getByTestId('local-spell-reader-error-back-btn')).toBeInTheDocument();
  });

  it('shows a standardized (EmptyState) error panel when the user is not logged in', async () => {
    const store = makeStore();
    renderPage(store);

    expect(await screen.findByTestId('local-spell-reader-error')).toBeInTheDocument();
  });

  describe('its spell in the player', () => {
    const doc = { id: 'doc-1', userId: 'user-1', title: 'Doc one', pagesContent: JSON.stringify(['a', 'b']) };

    it('loads its spell on entering', async () => {
      const get = vi.spyOn(db, 'getSpellById').mockResolvedValue(doc as never);
      const { store } = renderPage();
      await waitFor(() => expect(store.getState().spellReader.spellId).toBe('doc-1'));
      expect(get).toHaveBeenCalledTimes(1);
    });

    // Unloading from the reader leaves it, but navigations run as a transition: the reader
    // can still be here for a moment, and must not load its spell right back meanwhile.
    it('does not load it back when it is unloaded from here', async () => {
      const get = vi.spyOn(db, 'getSpellById').mockResolvedValue(doc as never);
      const { store } = renderPage();
      await waitFor(() => expect(store.getState().spellReader.spellId).toBe('doc-1'));
      act(() => { store.dispatch(resetSpellReader()); });
      await act(async () => { await Promise.resolve(); });
      expect(store.getState().spellReader.spellId).toBeNull();
      expect(get).toHaveBeenCalledTimes(1);
    });

    it('still loads its own spell back when the player switches to another one', async () => {
      const get = vi.spyOn(db, 'getSpellById').mockResolvedValue(doc as never);
      const { store } = renderPage();
      await waitFor(() => expect(store.getState().spellReader.spellId).toBe('doc-1'));
      act(() => { store.dispatch(setSpellFile({ id: 'doc-2', title: 'Other' })); });
      // Read again (more than once: reloading clears the player itself first), ending
      // with its own spell back in the player.
      await waitFor(() => expect(store.getState().spellReader.spellId).toBe('doc-1'));
      expect(get.mock.calls.length).toBeGreaterThan(1);
    });
  });
});

