import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellCard } from '../SpellCard';
import type { Spell } from '../../../../interfaces';
import * as db from '../../../../db';

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
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      {...props}
    />
  );

describe('SpellCard', () => {
  it('shows the play button when onPlay is provided and not in selection mode', () => {
    renderCard({ onPlay: vi.fn() });
    expect(screen.getByTestId('play-button')).toBeInTheDocument();
  });

  it('hides the play button while in selection mode', () => {
    renderCard({ onPlay: vi.fn(), selectionMode: true });
    expect(screen.queryByTestId('play-button')).not.toBeInTheDocument();
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
        <SpellCard doc={docWithCover} onClick={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />,
        { preloadedState: { casterInventory: { ...baseCasterInventory, activeCoverFrameId: 'grimoire' } } }
      );
      expect(screen.getAllByTestId('cover-frame-corner')[0]).toHaveAttribute('src', '/frames/grimoire-corner.svg');
    });

    it('applies no frame when the spell explicitly opted out (null), even with a global default set', () => {
      renderWithProviders(
        <SpellCard doc={{ ...docWithCover, coverFrameId: null }} onClick={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />,
        { preloadedState: { casterInventory: { ...baseCasterInventory, activeCoverFrameId: 'grimoire' } } }
      );
      expect(screen.queryByTestId('cover-frame-corner')).not.toBeInTheDocument();
    });

    // TCORE-123: the picker itself, opened from this card's own context menu (Last Spells/
    // Grimoire grid) -- this is where the frame gets EDITED, not just displayed.
    describe('context menu picker', () => {
      afterEach(() => { vi.restoreAllMocks(); });
      const openMenu = (id = 'doc-1') => fireEvent.click(screen.getByTestId(`spell-card-menu-btn-${id}`));

      // TCORE-123 follow-up: always shown regardless of ownership -- the picker itself
      // degrades to just Default/No frame when nothing is owned, rather than the menu
      // item deciding upfront whether there's anything to pick.
      it('shows the Cover Frame menu item even when no frame is owned', () => {
        renderWithProviders(
          <SpellCard doc={docWithCover} onClick={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />,
          { preloadedState: { casterInventory: { ...baseCasterInventory, unlockedIds: [] } } }
        );
        openMenu();
        expect(screen.getByTestId('spell-card-cover-frame-doc-1')).toBeInTheDocument();
      });

      it('opens the picker with only Default/No frame when no frame is owned', () => {
        renderWithProviders(
          <SpellCard doc={docWithCover} onClick={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />,
          { preloadedState: { casterInventory: { ...baseCasterInventory, unlockedIds: [] } } }
        );
        openMenu();
        fireEvent.click(screen.getByTestId('spell-card-cover-frame-doc-1'));

        expect(screen.getByTestId('cover-frame-option-default')).toBeInTheDocument();
        expect(screen.getByTestId('cover-frame-option-none')).toBeInTheDocument();
        expect(screen.queryByTestId('cover-frame-option-grimoire')).not.toBeInTheDocument();
      });

      it('shows the Cover Frame menu item once at least one frame is owned', () => {
        renderWithProviders(
          <SpellCard doc={docWithCover} onClick={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />,
          { preloadedState: { casterInventory: { ...baseCasterInventory, unlockedIds: ['grimoire'] } } }
        );
        openMenu();
        expect(screen.getByTestId('spell-card-cover-frame-doc-1')).toBeInTheDocument();
      });

      it('opens the picker modal listing Default/No frame plus each owned frame', () => {
        renderWithProviders(
          <SpellCard doc={docWithCover} onClick={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />,
          { preloadedState: { casterInventory: { ...baseCasterInventory, unlockedIds: ['grimoire'] } } }
        );
        openMenu();
        fireEvent.click(screen.getByTestId('spell-card-cover-frame-doc-1'));

        expect(screen.getByTestId('cover-frame-option-default')).toBeInTheDocument();
        expect(screen.getByTestId('cover-frame-option-none')).toBeInTheDocument();
        expect(screen.getByTestId('cover-frame-option-grimoire')).toBeInTheDocument();
      });

      it('picking a frame persists it via updateSpellCoverFrame and applies it immediately', async () => {
        const updateSpy = vi.spyOn(db, 'updateSpellCoverFrame').mockResolvedValue(undefined);
        renderWithProviders(
          <SpellCard doc={docWithCover} onClick={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />,
          { preloadedState: { casterInventory: { ...baseCasterInventory, unlockedIds: ['grimoire'] } } }
        );
        openMenu();
        fireEvent.click(screen.getByTestId('spell-card-cover-frame-doc-1'));
        fireEvent.click(screen.getByTestId('cover-frame-option-grimoire'));

        await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('doc-1', 'user-1', 'grimoire'));
        expect(screen.getAllByTestId('cover-frame-corner')[0]).toHaveAttribute('src', '/frames/grimoire-corner.svg');
      });

      it('picking "No frame" persists null', async () => {
        const updateSpy = vi.spyOn(db, 'updateSpellCoverFrame').mockResolvedValue(undefined);
        renderWithProviders(
          <SpellCard doc={docWithCover} onClick={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />,
          { preloadedState: { casterInventory: { ...baseCasterInventory, unlockedIds: ['grimoire'] } } }
        );
        openMenu();
        fireEvent.click(screen.getByTestId('spell-card-cover-frame-doc-1'));
        fireEvent.click(screen.getByTestId('cover-frame-option-none'));

        await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('doc-1', 'user-1', null));
      });

      it('picking "Default" persists undefined (clears this spell\'s override)', async () => {
        const updateSpy = vi.spyOn(db, 'updateSpellCoverFrame').mockResolvedValue(undefined);
        renderWithProviders(
          <SpellCard doc={{ ...docWithCover, coverFrameId: 'grimoire' }} onClick={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />,
          { preloadedState: { casterInventory: { ...baseCasterInventory, unlockedIds: ['grimoire'] } } }
        );
        openMenu();
        fireEvent.click(screen.getByTestId('spell-card-cover-frame-doc-1'));
        fireEvent.click(screen.getByTestId('cover-frame-option-default'));

        await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('doc-1', 'user-1', undefined));
      });

      it('reverts the optimistic pick if persisting fails', async () => {
        vi.spyOn(db, 'updateSpellCoverFrame').mockRejectedValue(new Error('boom'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        renderWithProviders(
          <SpellCard doc={docWithCover} onClick={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />,
          { preloadedState: { casterInventory: { ...baseCasterInventory, unlockedIds: ['grimoire'] } } }
        );
        openMenu();
        fireEvent.click(screen.getByTestId('spell-card-cover-frame-doc-1'));
        fireEvent.click(screen.getByTestId('cover-frame-option-grimoire'));

        await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
        expect(screen.queryByTestId('cover-frame-corner')).not.toBeInTheDocument();
      });
    });
  });
});
