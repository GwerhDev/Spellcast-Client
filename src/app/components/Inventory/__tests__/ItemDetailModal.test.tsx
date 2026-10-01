import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
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

  describe('opened from a bag slot', () => {
    const openedFrom = { rect: { top: 300, left: 40, width: 64, height: 64 } };

    it('the item flies from the slot into the preview, without turning over', () => {
      renderWithProviders(<ItemDetailModal asset={sound} isActive={false} canDeactivate onToggleActive={vi.fn()} onClose={vi.fn()} openedFrom={openedFrom} />);
      expect(screen.getByTestId('item-flight')).toBeInTheDocument();
      expect(screen.queryByTestId('item-flight-back')).not.toBeInTheDocument();
    });

    it('closes only once the item has flown back', async () => {
      const onClose = vi.fn();
      renderWithProviders(<ItemDetailModal asset={sound} isActive={false} canDeactivate onToggleActive={vi.fn()} onClose={onClose} openedFrom={openedFrom} />);
      await waitFor(() => expect(screen.queryByTestId('item-flight')).not.toBeInTheDocument());
      fireEvent.click(screen.getByTestId('custom-modal-close'));
      expect(screen.getByTestId('item-flight')).toBeInTheDocument();
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('opened without a slot, it just opens and closes', () => {
      const onClose = vi.fn();
      renderWithProviders(<ItemDetailModal asset={sound} isActive={false} canDeactivate onToggleActive={vi.fn()} onClose={onClose} />);
      expect(screen.queryByTestId('item-flight')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('custom-modal-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
