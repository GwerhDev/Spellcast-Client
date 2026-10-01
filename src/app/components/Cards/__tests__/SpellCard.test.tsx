import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellCard } from '../SpellCard';
import type { Spell } from '../../../../interfaces';
import { SPELL_DRAG_TYPE } from '../../../../config/consts';

const mockDoc: Spell = {
  id: 'doc-1',
  userId: 'user-1',
  title: 'My Book',
  createdAt: new Date(),
} as Spell;

const baseCasterInventory = {
  version: 6,
  unlockedIds: [] as string[],
  activeSoundBgId: null as string | null,
  activePageBgId: null as string | null,
  activeCompanionId: null as string | null,
  activeCoverFrameId: null as string | null,
  soundBgVolume: 0.35,
  masterVolume: 1,
  companionPlacements: {},
};

const renderCard = (props: Partial<React.ComponentProps<typeof SpellCard>> = {}) =>
  renderWithProviders(
    <SpellCard
      doc={mockDoc}
      onClick={vi.fn()}
      {...props}
    />
  );

describe('SpellCard', () => {
  it('is only its cover: no play button, menu or details over it', () => {
    renderCard();
    expect(screen.queryByTestId('play-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('spell-card-menu-btn-doc-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('spell-card-doc-1')).toHaveAttribute('title', 'My Book');
  });

  it('opens its detail on click', () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    fireEvent.click(screen.getByTestId('spell-card-doc-1'));
    expect(onClick).toHaveBeenCalled();
  });

  describe('reading indicator', () => {
    const wave = () => screen.getByTestId('spell-card-now-doc-1').querySelector('[data-testid="waveform"]')!;

    it('is not shown unless this is the loaded spell', () => {
      renderCard({ isPlaying: false, isActive: false });
      expect(screen.queryByTestId('spell-card-now-doc-1')).not.toBeInTheDocument();
    });

    it('shows animated bars while the loaded spell plays, flat while paused', () => {
      const { rerender } = renderCard({ isActive: true, isPlaying: true });
      expect(wave().className).toMatch(/active/);
      rerender(<SpellCard doc={mockDoc} onClick={vi.fn()} isActive isPlaying={false} />);
      expect(wave().className).toMatch(/idle/);
    });

    it('is not a control: clicking it opens the detail like the rest of the card', () => {
      const onClick = vi.fn();
      renderCard({ isActive: true, isPlaying: true, onClick });
      fireEvent.click(screen.getByTestId('spell-card-now-doc-1'));
      expect(onClick).toHaveBeenCalled();
      expect(screen.getByTestId('spell-card-now-doc-1').tagName).not.toBe('BUTTON');
    });

    it('is hidden in selection mode', () => {
      renderCard({ isActive: true, isPlaying: true, selectionMode: true });
      expect(screen.queryByTestId('spell-card-now-doc-1')).not.toBeInTheDocument();
    });
  });

  describe('drag to read', () => {
    it('is draggable and puts its spell id on the drag data', () => {
      renderCard();
      const card = screen.getByTestId('spell-card-doc-1');
      expect(card).toHaveAttribute('draggable', 'true');
      const setData = vi.fn();
      fireEvent.dragStart(card, { dataTransfer: { setData, effectAllowed: '' } });
      expect(setData).toHaveBeenCalledWith(SPELL_DRAG_TYPE, 'doc-1');
    });

    it('leaves an empty placeholder in its place while dragged, and restores it on dragend', async () => {
      renderCard();
      const card = screen.getByTestId('spell-card-doc-1');
      fireEvent.dragStart(card, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });
      // Swapped a frame later, after the browser has snapshotted the real card as drag image.
      expect(await screen.findByTestId('spell-card-placeholder-doc-1')).toBeInTheDocument();
      fireEvent.dragEnd(card);
      expect(screen.queryByTestId('spell-card-placeholder-doc-1')).not.toBeInTheDocument();
    });

    it('ties itself to the pointer with a thread from its place while dragged, gone on dragend', async () => {
      renderCard();
      const card = screen.getByTestId('spell-card-doc-1');
      fireEvent.dragStart(card, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });
      expect(await screen.findByTestId('drag-tether')).toBeInTheDocument();
      fireEvent.dragEnd(card);
      expect(screen.queryByTestId('drag-tether')).not.toBeInTheDocument();
    });

    it('does not leave the placeholder behind when the drag ends before the next frame', async () => {
      renderCard();
      const card = screen.getByTestId('spell-card-doc-1');
      fireEvent.dragStart(card, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });
      fireEvent.dragEnd(card);
      // Let the frame the dragstart scheduled run (and its update render) before checking.
      await act(async () => { await new Promise(resolve => requestAnimationFrame(() => resolve(null))); });
      expect(screen.queryByTestId('spell-card-placeholder-doc-1')).not.toBeInTheDocument();
    });

    it('is not draggable in selection mode', () => {
      renderCard({ selectionMode: true });
      expect(screen.getByTestId('spell-card-doc-1')).toHaveAttribute('draggable', 'false');
    });
  });

  // TCORE-123
  describe('cover frame', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    beforeEach(() => { URL.createObjectURL = vi.fn(() => 'blob:mock'); });
    afterEach(() => { URL.createObjectURL = originalCreateObjectURL; });

    const docWithCover: Spell = { ...mockDoc, cover: new Blob(['x']) };

    it('applies this spell\'s own explicit cover frame, ignoring the global default', () => {
      renderCard({
        doc: { ...docWithCover, coverFrameId: 'grimoire' },
      });
      expect(screen.getAllByTestId('cover-frame-corner')[0]).toHaveAttribute('src', '/frames/grimoire-corner.svg');
    });

    it('falls back to the global default when the spell never made an explicit choice', () => {
      renderWithProviders(
        <SpellCard doc={docWithCover} onClick={vi.fn()} />,
        { preloadedState: { casterInventory: { ...baseCasterInventory, activeCoverFrameId: 'grimoire' } } }
      );
      expect(screen.getAllByTestId('cover-frame-corner')[0]).toHaveAttribute('src', '/frames/grimoire-corner.svg');
    });

    it('applies no frame when the spell explicitly opted out (null), even with a global default set', () => {
      renderWithProviders(
        <SpellCard doc={{ ...docWithCover, coverFrameId: null }} onClick={vi.fn()} />,
        { preloadedState: { casterInventory: { ...baseCasterInventory, activeCoverFrameId: 'grimoire' } } }
      );
      expect(screen.queryByTestId('cover-frame-corner')).not.toBeInTheDocument();
    });
  });

  describe('keyboard', () => {
    it('is reachable by Tab and opens its detail with Enter or Space', () => {
      const onClick = vi.fn();
      renderCard({ onClick });
      const card = screen.getByTestId('spell-card-doc-1');
      expect(card).toHaveAttribute('tabindex', '0');
      expect(card).toHaveAttribute('role', 'button');

      fireEvent.keyDown(card, { key: 'Enter' });
      fireEvent.keyDown(card, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('selects with Space in selection mode instead of opening', () => {
      const onClick = vi.fn();
      const onToggleSelect = vi.fn();
      renderCard({ onClick, selectionMode: true, onToggleSelect });
      fireEvent.keyDown(screen.getByTestId('spell-card-doc-1'), { key: ' ' });
      expect(onToggleSelect).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('stays out of the tab order when it is only shown (focusable off)', () => {
      renderCard({ focusable: false });
      expect(screen.getByTestId('spell-card-doc-1')).toHaveAttribute('tabindex', '-1');
    });
  });
});
