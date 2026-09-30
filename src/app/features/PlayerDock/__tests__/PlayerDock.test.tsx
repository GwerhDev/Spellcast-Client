import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { PlayerDock } from '../index';
import { SPELL_DRAG_TYPE } from '../../../../config/consts';
import { NEAR_BOTTOM_PX } from '../../../../hooks/useSpellDrag';
import { setSpellFile } from '../../../../store/spellReaderSlice';
import { play } from '../../../../store/browserPlayerSlice';
import * as db from '../../../../db';

const spellDrag = (id = 'spell-2') => ({
  dataTransfer: {
    types: [SPELL_DRAG_TYPE],
    getData: (type: string) => (type === SPELL_DRAG_TYPE ? id : ''),
    dropEffect: 'none',
  },
});

// A spell dragged over the page at a given height (a document-level dragover).
const dragAt = (clientY: number) => {
  const event = new MouseEvent('dragover', { bubbles: true, clientX: 10, clientY });
  Object.defineProperty(event, 'dataTransfer', { value: { types: [SPELL_DRAG_TYPE] } });
  act(() => { document.dispatchEvent(event); });
};

const loggedStore = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  return store;
};

const spell2 = { id: 'spell-2', title: 'Spell two', userId: 'user-1', createdAt: new Date(), pagesContent: '["a"]' };

describe('PlayerDock', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db, 'getSpellById').mockResolvedValue(spell2 as never);
  });

  it('with nothing loaded, appears only while a spell is dragged near the bottom', () => {
    renderWithProviders(<PlayerDock />, { store: loggedStore() });
    expect(screen.queryByTestId('player-dock')).not.toBeInTheDocument();
    dragAt(10);
    expect(screen.queryByTestId('player-dock')).not.toBeInTheDocument();
    dragAt(window.innerHeight - NEAR_BOTTOM_PX + 10);
    expect(screen.getByTestId('player-dock-empty')).toBeInTheDocument();
    act(() => { document.dispatchEvent(new Event('dragend')); });
    expect(screen.queryByTestId('player-dock')).not.toBeInTheDocument();
  });

  it('dropping a spell on the empty dock starts playing it, like the altar', async () => {
    const store = loggedStore();
    renderWithProviders(<PlayerDock />, { store });
    dragAt(window.innerHeight - 10);
    await act(async () => { fireEvent.drop(screen.getByTestId('player-dock'), spellDrag()); });
    await waitFor(() => expect(store.getState().spellReader.spellId).toBe('spell-2'));
    expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(true);
  });

  it('lights up with the switch hint while a spell is over the loaded player', () => {
    const store = loggedStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one', userId: 'user-1' }));
    renderWithProviders(<PlayerDock><div data-testid="player" /></PlayerDock>, { store });
    dragAt(window.innerHeight - 10);
    fireEvent.dragEnter(screen.getByTestId('player-dock'), spellDrag());
    expect(screen.getByTestId('player-dock-overlay')).toBeInTheDocument();
  });

  it('dropping another spell on the loaded player switches to it and plays it', async () => {
    const store = loggedStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one', userId: 'user-1' }));
    store.dispatch(play());
    renderWithProviders(<PlayerDock><div data-testid="player" /></PlayerDock>, { store });
    await act(async () => { fireEvent.drop(screen.getByTestId('player-dock'), spellDrag()); });
    await waitFor(() => expect(store.getState().spellReader.spellId).toBe('spell-2'));
    expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(true);
  });

  it('also plays the dropped spell when the loaded one was paused', async () => {
    const store = loggedStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one', userId: 'user-1' }));
    renderWithProviders(<PlayerDock><div data-testid="player" /></PlayerDock>, { store });
    await act(async () => { fireEvent.drop(screen.getByTestId('player-dock'), spellDrag()); });
    await waitFor(() => expect(store.getState().spellReader.spellId).toBe('spell-2'));
    expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(true);
  });

  it('ignores drags that are not spells', async () => {
    const store = loggedStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one', userId: 'user-1' }));
    renderWithProviders(<PlayerDock><div data-testid="player" /></PlayerDock>, { store });
    await act(async () => { fireEvent.drop(screen.getByTestId('player-dock'), { dataTransfer: { types: ['Files'], files: [] } }); });
    expect(store.getState().spellReader.spellId).toBe('spell-1');
  });
});
