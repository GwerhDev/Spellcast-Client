import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageBackgroundCard } from '../PageBackgroundCard';
import { LanguageProvider } from '../../../../i18n';
import type { PageBackground } from '../../../../config/assets';

const freeAsset: PageBackground = {
  id: 'default', name: 'Parchment', description: 'Default page.', category: 'page-background',
  unlockMethod: 'free', cssValue: null, thumbnail: '#fdf6e3', tags: [],
};

const renderCard = (props: Partial<React.ComponentProps<typeof PageBackgroundCard>> = {}) =>
  render(
    <LanguageProvider>
      <PageBackgroundCard asset={freeAsset} unlocked={false} isActive={false} onAction={vi.fn()} {...props} />
    </LanguageProvider>
  );

describe('PageBackgroundCard', () => {
  it('shows an unlock button when locked and free', () => {
    renderCard({ unlocked: false });
    expect(screen.getByTestId('page-unlock-default')).toBeInTheDocument();
  });

  it('calls onAction with the asset id when unlocking', () => {
    const onAction = vi.fn();
    renderCard({ unlocked: false, onAction });
    screen.getByTestId('page-unlock-default').click();
    expect(onAction).toHaveBeenCalledWith('default');
  });

  describe('equip mode (default)', () => {
    it('shows an activate/deactivate toggle button when unlocked', () => {
      renderCard({ unlocked: true, isActive: false });
      expect(screen.getByTestId('page-toggle-default')).toBeInTheDocument();
    });

    it('calls onAction when clicking anywhere on an unlocked card (whole-card equip)', () => {
      const onAction = vi.fn();
      renderCard({ unlocked: true, isActive: false, onAction });
      screen.getByTestId('page-card-default').click();
      expect(onAction).toHaveBeenCalledWith('default');
    });
  });

  describe('acquisition-only mode (showEquipControls=false) -- Havenstore usage, TCORE-109', () => {
    it('shows a static "owned" status instead of a toggle button when unlocked', () => {
      renderCard({ unlocked: true, isActive: false, showEquipControls: false });
      expect(screen.getByTestId('page-owned-default')).toBeInTheDocument();
      expect(screen.queryByTestId('page-toggle-default')).not.toBeInTheDocument();
    });

    it('does not equip when clicking the card itself (unlocking stays button-only)', () => {
      const onAction = vi.fn();
      renderCard({ unlocked: true, isActive: false, showEquipControls: false, onAction });
      screen.getByTestId('page-card-default').click();
      expect(onAction).not.toHaveBeenCalled();
    });
  });
});
