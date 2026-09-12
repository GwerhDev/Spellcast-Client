import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoverFrameCard } from '../CoverFrameCard';
import { LanguageProvider } from '../../../../i18n';
import type { CoverFrame } from '../../../../config/assets';

const freeAsset: CoverFrame = {
  id: 'gilded', name: 'Gilded', description: 'A slim gold frame.', category: 'cover-frame',
  unlockMethod: 'free', cssValue: '3px solid #c9a24a', thumbnail: '#c9a24a', tags: [],
};

const renderCard = (props: Partial<React.ComponentProps<typeof CoverFrameCard>> = {}) =>
  render(
    <LanguageProvider>
      <CoverFrameCard asset={freeAsset} unlocked={false} isActive={false} onAction={vi.fn()} {...props} />
    </LanguageProvider>
  );

describe('CoverFrameCard', () => {
  it('shows an unlock button when locked and free', () => {
    renderCard({ unlocked: false });
    expect(screen.getByTestId('cover-frame-unlock-gilded')).toBeInTheDocument();
  });

  it('calls onAction with the asset id when unlocking', () => {
    const onAction = vi.fn();
    renderCard({ unlocked: false, onAction });
    screen.getByTestId('cover-frame-unlock-gilded').click();
    expect(onAction).toHaveBeenCalledWith('gilded');
  });

  // TCORE-123: unlike PageBackgroundCard, equipping this card only ever sets/clears the
  // GLOBAL default (casterInventorySlice.activeCoverFrameId) -- never a spell's own pick.
  describe('equip mode (default) -- CasterInventoryLanding sets the global default', () => {
    it('shows an activate/deactivate toggle button when unlocked', () => {
      renderCard({ unlocked: true, isActive: false });
      expect(screen.getByTestId('cover-frame-toggle-gilded')).toBeInTheDocument();
    });

    it('calls onAction when clicking anywhere on an unlocked card (whole-card equip)', () => {
      const onAction = vi.fn();
      renderCard({ unlocked: true, isActive: false, onAction });
      screen.getByTestId('cover-frame-card-gilded').click();
      expect(onAction).toHaveBeenCalledWith('gilded');
    });
  });

  describe('acquisition-only mode (showEquipControls=false) -- Havenstore usage', () => {
    it('shows a static "owned" status instead of a toggle button when unlocked', () => {
      renderCard({ unlocked: true, isActive: false, showEquipControls: false });
      expect(screen.getByTestId('cover-frame-owned-gilded')).toBeInTheDocument();
      expect(screen.queryByTestId('cover-frame-toggle-gilded')).not.toBeInTheDocument();
    });

    it('does not equip when clicking the card itself (unlocking stays button-only)', () => {
      const onAction = vi.fn();
      renderCard({ unlocked: true, isActive: false, showEquipControls: false, onAction });
      screen.getByTestId('cover-frame-card-gilded').click();
      expect(onAction).not.toHaveBeenCalled();
    });
  });
});
