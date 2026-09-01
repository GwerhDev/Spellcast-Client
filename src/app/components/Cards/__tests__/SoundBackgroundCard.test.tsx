import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SoundBackgroundCard } from '../SoundBackgroundCard';
import { LanguageProvider } from '../../../../i18n';
import type { SoundBackground } from '../../../../config/assets';

const freeAsset: SoundBackground = {
  id: 'rain-window', name: 'Rain on Window', description: 'Gentle rain.', category: 'sound-background',
  unlockMethod: 'free', streamUrl: '/rain.mp3', loop: true, tags: ['calm'],
};

const achievementAsset: SoundBackground = {
  ...freeAsset, id: 'ocean-tides', name: 'Ocean Tides', unlockMethod: 'achievement',
};

const renderCard = (props: Partial<React.ComponentProps<typeof SoundBackgroundCard>> = {}) =>
  render(
    <LanguageProvider>
      <SoundBackgroundCard asset={freeAsset} unlocked={false} isActive={false} onAction={vi.fn()} {...props} />
    </LanguageProvider>
  );

describe('SoundBackgroundCard', () => {
  it('shows an unlock button when locked and free', () => {
    renderCard({ unlocked: false });
    expect(screen.getByTestId('sound-unlock-rain-window')).toBeInTheDocument();
  });

  it('calls onAction with the asset id when unlocking', () => {
    const onAction = vi.fn();
    renderCard({ unlocked: false, onAction });
    screen.getByTestId('sound-unlock-rain-window').click();
    expect(onAction).toHaveBeenCalledWith('rain-window');
  });

  it('shows an achievement label instead of an unlock button when locked via achievement', () => {
    renderCard({ asset: achievementAsset, unlocked: false });
    expect(screen.queryByTestId('sound-unlock-ocean-tides')).not.toBeInTheDocument();
  });

  describe('equip mode (default) -- ReaderSettings-equivalent/Inventory usage', () => {
    it('shows the active pill when unlocked and isActive', () => {
      renderCard({ unlocked: true, isActive: true });
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    it('shows an activate/deactivate toggle button when unlocked', () => {
      renderCard({ unlocked: true, isActive: false });
      expect(screen.getByTestId('sound-toggle-rain-window')).toBeInTheDocument();
    });
  });

  describe('acquisition-only mode (showEquipControls=false) -- Havenstore usage, TCORE-109', () => {
    it('never shows the active pill', () => {
      renderCard({ unlocked: true, isActive: true, showEquipControls: false });
      expect(screen.queryByText(/active/i)).not.toBeInTheDocument();
    });

    it('shows a static "owned" status instead of a toggle button when unlocked', () => {
      renderCard({ unlocked: true, isActive: false, showEquipControls: false });
      expect(screen.getByTestId('sound-owned-rain-window')).toBeInTheDocument();
      expect(screen.queryByTestId('sound-toggle-rain-window')).not.toBeInTheDocument();
    });
  });
});
