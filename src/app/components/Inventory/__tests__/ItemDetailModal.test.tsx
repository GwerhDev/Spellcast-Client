import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { ItemDetailModal } from '../ItemDetailModal';
import { soundBackgrounds, pageBackgrounds } from '../../../../config/assets';

const sound = soundBackgrounds[0];

describe('ItemDetailModal', () => {
  it('renders nothing without an asset', () => {
    renderWithProviders(<ItemDetailModal asset={null} isActive={false} canDeactivate onToggleActive={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByTestId('item-detail')).not.toBeInTheDocument();
  });

  it('shows the item details', () => {
    renderWithProviders(<ItemDetailModal asset={sound} isActive={false} canDeactivate onToggleActive={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('item-detail')).toHaveTextContent(sound.description);
  });

  it('activates an inactive item', () => {
    const onToggleActive = vi.fn();
    renderWithProviders(<ItemDetailModal asset={sound} isActive={false} canDeactivate onToggleActive={onToggleActive} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('item-detail-activate'));
    expect(onToggleActive).toHaveBeenCalledWith(sound);
  });

  it('deactivates an active item that can be cleared', () => {
    const onToggleActive = vi.fn();
    renderWithProviders(<ItemDetailModal asset={sound} isActive canDeactivate onToggleActive={onToggleActive} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('item-detail-deactivate'));
    expect(onToggleActive).toHaveBeenCalledWith(sound);
  });

  it('shows a static active note (no button) when the active item cannot be cleared', () => {
    renderWithProviders(<ItemDetailModal asset={pageBackgrounds[0]} isActive canDeactivate={false} onToggleActive={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('item-detail-active')).toBeInTheDocument();
    expect(screen.queryByTestId('item-detail-deactivate')).not.toBeInTheDocument();
  });
});
