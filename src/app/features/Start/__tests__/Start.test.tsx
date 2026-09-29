import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Start } from '../index';
import { SPELL_DRAG_TYPE } from '../../../../config/consts';
import type { Spell } from '../../../../interfaces';
import { setSpellLoaded } from '../../../../store/spellReaderSlice';
import { setSpellDetails } from '../../../../store/spellSlice';
import { play } from '../../../../store/browserPlayerSlice';

// ImportOption uses pdfjs-dist (DOMMatrix not in jsdom)
vi.mock('../ImportOption', () => ({
  ImportOption: () => null,
}));
// WriteOption uses window.speechSynthesis (not in jsdom)
vi.mock('../WriteOption', () => ({
  WriteOption: () => null,
}));

const spell = { id: 'spell-1', userId: undefined, title: 'Spell one', createdAt: new Date(), pagesContent: '["a"]' } as Spell;
const mockGetSpellById = vi.fn();
vi.mock('../../../../db', () => ({
  getSpellById: (...args: unknown[]) => mockGetSpellById(...args),
  // Covers are read through getSpellById here, so each test's own spell (and timing) applies.
  getSpellCover: (...args: unknown[]) => Promise.resolve(mockGetSpellById(...args)).then((d) => (d as { cover?: Blob } | null | undefined)?.cover ?? null),
  getCachedSpellCover: () => undefined,
}));

// A drag carrying a spell, as a SpellCard's dragstart sets it up.
const spellDrag = (id = 'spell-1') => ({
  dataTransfer: {
    types: [SPELL_DRAG_TYPE],
    getData: (type: string) => (type === SPELL_DRAG_TYPE ? id : ''),
    dropEffect: 'none',
  },
});

beforeEach(() => {
  mockGetSpellById.mockReset().mockResolvedValue(spell);
});

describe('Start', () => {
  it('renders start container', () => {
    renderWithProviders(<Start />);
    expect(screen.getByTestId('start')).toBeInTheDocument();
  });

  it('shows the Read control on its own, with no tabs', () => {
    renderWithProviders(<Start />);
    expect(screen.getByTestId('read-option')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^segmented-tab-/)).toHaveLength(0);
  });

  it('opens Write and Import as modals from the Spellcast button menu', () => {
    renderWithProviders(<Start />);
    fireEvent.click(screen.getByTestId('play-button'));
    fireEvent.click(screen.getByTestId('radial-menu-item-write'));
    expect(screen.getByTestId('start-write-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('custom-modal-close'));
    expect(screen.queryByTestId('start-write-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('play-button'));
    fireEvent.click(screen.getByTestId('radial-menu-item-import'));
    expect(screen.getByTestId('start-import-modal')).toBeInTheDocument();
  });

  it('closing Import drops whatever it had pending', () => {
    const { store } = renderWithProviders(<Start />);
    fireEvent.click(screen.getByTestId('play-button'));
    fireEvent.click(screen.getByTestId('radial-menu-item-import'));
    act(() => { store.dispatch(setSpellDetails({ fileContent: 'x', size: 1, type: 'pdf', title: 'Pending', totalPages: 1 })); });
    fireEvent.click(screen.getByTestId('custom-modal-close'));
    expect(store.getState().spell.isLoaded).toBe(false);
  });

  it('lights up the Read control when a spell is dragged over, but not for file drags', () => {
    renderWithProviders(<Start />);
    const start = screen.getByTestId('start');
    fireEvent.dragEnter(start, { dataTransfer: { types: ['Files'] } });
    expect(screen.getByTestId('read-option-hint')).not.toHaveTextContent('Drop it');
    fireEvent.dragEnter(start, spellDrag());
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drop it');
  });

  it('starts reading the dropped spell without navigating', async () => {
    const { store } = renderWithProviders(<Start />);
    await screen.findByTestId('read-option');
    const start = screen.getByTestId('start');
    fireEvent.dragEnter(start, spellDrag());
    await act(async () => { fireEvent.drop(start, spellDrag()); });
    await waitFor(() => expect(store.getState().spellReader.spellId).toBe('spell-1'));
    expect(mockGetSpellById).toHaveBeenCalledWith('spell-1', undefined);
    expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(true);
  });

  describe('drag state', () => {
    // jsdom has no DragEvent, so fireEvent.dragLeave drops relatedTarget; build the leave
    // as a MouseEvent (which carries it) with the drag's dataTransfer attached.
    const dragLeave = (el: Element, relatedTarget: EventTarget | null) => {
      const event = new MouseEvent('dragleave', { bubbles: true, relatedTarget });
      Object.defineProperty(event, 'dataTransfer', { value: spellDrag().dataTransfer });
      act(() => { el.dispatchEvent(event); });
    };

    const dragOverStart = async () => {
      renderWithProviders(<Start />);
      await screen.findByTestId('read-option');
      fireEvent.dragEnter(screen.getByTestId('start'), spellDrag());
      expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drop it');
    };

    it('stays active while moving between elements inside Start', async () => {
      await dragOverStart();
      const start = screen.getByTestId('start');
      dragLeave(start, screen.getByTestId('play-button'));
      expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drop it');
    });

    // An element a drag entered through can be removed mid-drag, and its dragleave never
    // comes -- so the state relies on relatedTarget, not on counting enter/leave pairs.
    it('ends when the drag leaves Start', async () => {
      await dragOverStart();
      dragLeave(screen.getByTestId('start'), document.body);
      expect(screen.getByTestId('read-option-hint')).not.toHaveTextContent('Drop it');
    });

    it('ends when the drag is cancelled or dropped elsewhere (dragend)', async () => {
      await dragOverStart();
      act(() => { document.dispatchEvent(new Event('dragend', { bubbles: true })); });
      expect(screen.getByTestId('read-option-hint')).not.toHaveTextContent('Drop it');
    });
  });

  it('dropping the spell that is already playing does not pause it', async () => {
    const { store } = renderWithProviders(<Start />);
    await screen.findByTestId('read-option');
    const start = screen.getByTestId('start');
    await act(async () => { fireEvent.drop(start, spellDrag()); });
    await waitFor(() => expect(store.getState().spellReader.spellId).toBe('spell-1'));
    act(() => {
      store.dispatch(setSpellLoaded(true));
      store.dispatch(play());
    });
    const { toggleSeq } = store.getState().browserPlayer;
    fireEvent.dragEnter(start, spellDrag());
    await act(async () => { fireEvent.drop(start, spellDrag()); });
    expect(store.getState().browserPlayer.toggleSeq).toBe(toggleSeq);
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
  });

});
