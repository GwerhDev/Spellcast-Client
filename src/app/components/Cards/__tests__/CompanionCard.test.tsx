import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanionCard } from '../CompanionCard';
import { LanguageProvider } from '../../../../i18n';
import type { Companion } from '../../../../config/assets';

const freeCompanion: Companion = {
  id: 'cats', name: 'Kuro & Sunny', description: 'A pair of cats.', category: 'companion',
  unlockMethod: 'free', models: [], thumbnail: '#000', tags: [],
};

const achievementCompanion: Companion = {
  ...freeCompanion, id: 'owl', name: 'Owl', unlockMethod: 'achievement',
};

const soonCompanion: Companion = {
  ...freeCompanion, id: 'fox', name: 'Fox', comingSoon: true,
};

const renderCard = (props: Partial<React.ComponentProps<typeof CompanionCard>> = {}) =>
  render(
    <LanguageProvider>
      <CompanionCard companion={freeCompanion} unlocked={false} isActive={false} onAction={vi.fn()} {...props} />
    </LanguageProvider>
  );

describe('CompanionCard', () => {
  it('shows an unlock button when locked and free', () => {
    renderCard({ unlocked: false });
    expect(screen.getByTestId('companion-unlock-cats')).toBeInTheDocument();
  });

  it('calls onAction with the companion id when unlocking', () => {
    const onAction = vi.fn();
    renderCard({ unlocked: false, onAction });
    screen.getByTestId('companion-unlock-cats').click();
    expect(onAction).toHaveBeenCalledWith('cats');
  });

  it('shows an achievement label instead of an unlock button when locked via achievement', () => {
    renderCard({ companion: achievementCompanion, unlocked: false });
    expect(screen.queryByTestId('companion-unlock-owl')).not.toBeInTheDocument();
  });

  it('shows a "Soon" badge for a comingSoon companion regardless of unlocked', () => {
    renderCard({ companion: soonCompanion, unlocked: true });
    expect(screen.getByTestId('companion-soon-fox')).toBeInTheDocument();
  });

  describe('equip mode (showEquipControls default true) -- ReaderSettings/Inventory usage', () => {
    it('shows the active pill when unlocked and isActive', () => {
      renderCard({ unlocked: true, isActive: true });
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    it('shows an activate/deactivate toggle button when unlocked', () => {
      renderCard({ unlocked: true, isActive: false });
      expect(screen.getByTestId('companion-toggle-cats')).toBeInTheDocument();
    });

    it('calls onAction with the companion id when toggling equip state', () => {
      const onAction = vi.fn();
      renderCard({ unlocked: true, isActive: false, onAction });
      screen.getByTestId('companion-toggle-cats').click();
      expect(onAction).toHaveBeenCalledWith('cats');
    });
  });

  describe('acquisition-only mode (showEquipControls=false) -- Havenstore usage, TCORE-109', () => {
    it('never shows the active pill, even if isActive is somehow true', () => {
      renderCard({ unlocked: true, isActive: true, showEquipControls: false });
      expect(screen.queryByText(/active/i)).not.toBeInTheDocument();
    });

    it('does not show an activate/deactivate toggle button when unlocked', () => {
      renderCard({ unlocked: true, isActive: false, showEquipControls: false });
      expect(screen.queryByTestId('companion-toggle-cats')).not.toBeInTheDocument();
    });

    it('shows a static "owned" status instead of a toggle button when unlocked', () => {
      renderCard({ unlocked: true, isActive: false, showEquipControls: false });
      expect(screen.getByTestId('companion-owned-cats')).toBeInTheDocument();
    });

    it('still shows the unlock button when locked and free', () => {
      renderCard({ unlocked: false, showEquipControls: false });
      expect(screen.getByTestId('companion-unlock-cats')).toBeInTheDocument();
    });
  });
});
