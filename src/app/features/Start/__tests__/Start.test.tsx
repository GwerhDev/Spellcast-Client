import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Start } from '../index';
import { SPELL_DRAG_TYPE } from '../../../../config/consts';
import type { Spell } from '../../../../interfaces';
import { invalidateSpellList } from '../../../../store/spellReaderSlice';

// ImportOption uses pdfjs-dist (DOMMatrix not in jsdom)
vi.mock('../ImportOption', () => ({
  ImportOption: () => null,
}));
// TextOption uses window.speechSynthesis (not in jsdom)
vi.mock('../TextOption', () => ({
  TextOption: () => null,
}));

const spell = { id: 'spell-1', userId: undefined, title: 'Spell one', createdAt: new Date(), pagesContent: '["a"]' } as Spell;
const mockGetSpells = vi.fn();
const mockGetSpellById = vi.fn();
vi.mock('../../../../db', () => ({
  getSpellsFromDB: (...args: unknown[]) => mockGetSpells(...args),
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
  mockGetSpells.mockReset().mockResolvedValue([spell]);
  mockGetSpellById.mockReset().mockResolvedValue(spell);
});

describe('Start', () => {
  it('renders start container', () => {
    renderWithProviders(<Start />);
    expect(screen.getByTestId('start')).toBeInTheDocument();
  });

  it('has no Read tab when the grimoire is empty', async () => {
    mockGetSpells.mockResolvedValue([]);
    renderWithProviders(<Start />);
    await waitFor(() => expect(mockGetSpells).toHaveBeenCalled());
    expect(screen.queryByTestId('segmented-tab-read')).not.toBeInTheDocument();
  });

  it('shows the Read tab once there is at least one spell, first and selected by default', async () => {
    renderWithProviders(<Start />);
    expect(await screen.findByTestId('read-option')).toBeInTheDocument();
    const tabs = screen.getAllByTestId(/^segmented-tab-/);
    expect(tabs[0]).toHaveAttribute('data-testid', 'segmented-tab-read');
  });

  it('keeps the tab the user picked instead of jumping back to Read', async () => {
    renderWithProviders(<Start />);
    await screen.findByTestId('read-option');
    fireEvent.click(screen.getByTestId('segmented-tab-text'));
    expect(screen.queryByTestId('read-option')).not.toBeInTheDocument();
  });

  it('defaults to Text when the grimoire is empty', async () => {
    mockGetSpells.mockResolvedValue([]);
    renderWithProviders(<Start />);
    await waitFor(() => expect(mockGetSpells).toHaveBeenCalled());
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
    await screen.findByTestId('segmented-tab-read');
    const start = screen.getByTestId('start');
    fireEvent.dragEnter(start, spellDrag());
    await act(async () => { fireEvent.drop(start, spellDrag()); });
    await waitFor(() => expect(store.getState().spellReader.spellId).toBe('spell-1'));
    expect(mockGetSpellById).toHaveBeenCalledWith('spell-1', undefined);
    expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(true);
  });

  it('drops the Read tab (back to Text) once the last spell is deleted', async () => {
    const { store } = renderWithProviders(<Start />);
    await screen.findByTestId('read-option');
    mockGetSpells.mockResolvedValue([]);
    act(() => { store.dispatch(invalidateSpellList()); });
    await waitFor(() => expect(screen.queryByTestId('segmented-tab-read')).not.toBeInTheDocument());
    expect(screen.queryByTestId('read-option')).not.toBeInTheDocument();
  });
});
