import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Start } from '../index';
import { SPELL_DRAG_TYPE } from '../../../../config/consts';
import type { Spell } from '../../../../interfaces';
import { setSpellLoaded } from '../../../../store/spellReaderSlice';
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

  it('always offers Read, first and selected by default, even with an empty grimoire', () => {
    renderWithProviders(<Start />);
    expect(screen.getByTestId('read-option')).toBeInTheDocument();
    const tabs = screen.getAllByTestId(/^segmented-tab-/);
    expect(tabs.map(tab => tab.getAttribute('data-testid'))).toEqual(['segmented-tab-read', 'segmented-tab-write', 'segmented-tab-import']);
  });

  it('switches tabs when the user picks one', () => {
    renderWithProviders(<Start />);
    fireEvent.click(screen.getByTestId('segmented-tab-write'));
    expect(screen.queryByTestId('read-option')).not.toBeInTheDocument();
  });

  it('switches to the Read tab when a spell is dragged over, whatever tab was showing', async () => {
    renderWithProviders(<Start />);
    await screen.findByTestId('read-option');
    fireEvent.click(screen.getByTestId('segmented-tab-import'));
    expect(screen.queryByTestId('read-option')).not.toBeInTheDocument();
    fireEvent.dragEnter(screen.getByTestId('start'), spellDrag());
    expect(screen.getByTestId('read-option')).toBeInTheDocument();
  });

  it('ignores drags that are not spells (e.g. files for the import dropzone)', async () => {
    renderWithProviders(<Start />);
    await screen.findByTestId('read-option');
    fireEvent.click(screen.getByTestId('segmented-tab-import'));
    fireEvent.dragEnter(screen.getByTestId('start'), { dataTransfer: { types: ['Files'] } });
    expect(screen.queryByTestId('read-option')).not.toBeInTheDocument();
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
      fireEvent.click(screen.getByTestId('segmented-tab-write'));
      fireEvent.dragEnter(screen.getByTestId('start'), spellDrag());
      expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drop it');
    };

    it('stays active while moving between elements inside Start', async () => {
      await dragOverStart();
      const start = screen.getByTestId('start');
      dragLeave(start, screen.getByTestId('play-button'));
      expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drop it');
    });

    // The drag entered through the Write tab's content, which the switch to Read removed --
    // its own dragleave never comes, so the state can't rely on counting enter/leave pairs.
    it('ends when the drag leaves Start, even after entering through a removed element', async () => {
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
