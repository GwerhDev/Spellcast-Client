import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Start } from '../index';
import { SPELL_DRAG_TYPE } from '../../../../config/consts';
import type { Spell } from '../../../../interfaces';
import { setSpellDetails } from '../../../../store/spellSlice';

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

  it('shows the altar on its own, with no tabs', () => {
    renderWithProviders(<Start />);
    expect(screen.getByTestId('altar')).toBeInTheDocument();
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

  // The altar is the drop target: the rest of the section doesn't take spells.
  it('does not read a spell dropped on Start outside the altar', async () => {
    const { store } = renderWithProviders(<Start />);
    const body = screen.getByTestId('start-body');
    fireEvent.dragEnter(body, spellDrag());
    await act(async () => { fireEvent.drop(body, spellDrag()); });
    expect(mockGetSpellById).not.toHaveBeenCalledWith('spell-1', undefined);
    expect(store.getState().spellReader.spellId).toBeNull();
    expect(screen.getByTestId('altar').className).not.toMatch(/dragActive/);
  });
});
