import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

const renderModal = (props: Partial<React.ComponentProps<typeof DeleteConfirmModal>> = {}) =>
  renderWithProviders(
    <DeleteConfirmModal show onClose={vi.fn()} onConfirm={vi.fn()} title="Title" message="Message" {...props} />,
  );

describe('DeleteConfirmModal', () => {
  it('labels the confirm button "Delete" by default', () => {
    renderModal();
    expect(screen.getByTestId('delete-confirm-confirm-btn')).toHaveTextContent('Delete');
  });

  it('uses a custom confirm label for destructive actions that are not a deletion', () => {
    renderModal({ confirmText: 'Reset' });
    expect(screen.getByTestId('delete-confirm-confirm-btn')).toHaveTextContent('Reset');
  });

  it('confirms and cancels through its callbacks', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    renderModal({ onConfirm, onClose });
    fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));
    fireEvent.click(screen.getByTestId('delete-confirm-cancel-btn'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while hidden', () => {
    renderModal({ show: false });
    expect(screen.queryByTestId('delete-confirm-confirm-btn')).not.toBeInTheDocument();
  });
});
