import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellUnlockModal } from '../SpellUnlockModal';

const renderModal = (over: Partial<Parameters<typeof SpellUnlockModal>[0]> = {}) => {
  const props = { fileName: 'Locked', wrong: false, busy: false, onSubmit: vi.fn(), onCancel: vi.fn(), ...over };
  renderWithProviders(<SpellUnlockModal {...props} />);
  return props;
};

describe('SpellUnlockModal', () => {
  it('shows nothing while no password is asked for', () => {
    renderModal({ fileName: null });
    expect(screen.queryByTestId('spell-unlock-modal')).not.toBeInTheDocument();
  });

  it('gives the password typed, once there is one', () => {
    const props = renderModal();
    expect(screen.getByTestId('spell-unlock-modal').textContent).toContain('Locked');
    expect(screen.getByTestId('spell-unlock-submit')).toBeDisabled();
    fireEvent.change(document.getElementById('spell-unlock-password')!, { target: { value: 'right' } });
    fireEvent.click(screen.getByTestId('spell-unlock-submit'));
    expect(props.onSubmit).toHaveBeenCalledWith('right');
    fireEvent.click(screen.getByTestId('spell-unlock-cancel'));
    expect(props.onCancel).toHaveBeenCalled();
  });

  it('says when the password given was not it', () => {
    renderModal({ wrong: true });
    expect(screen.getByTestId('spell-unlock-wrong')).toBeInTheDocument();
  });

  it('can not be given another password nor closed while one is tried', () => {
    const props = renderModal({ busy: true });
    expect(screen.getByTestId('spell-unlock-submit')).toBeDisabled();
    expect(screen.getByTestId('spell-unlock-cancel')).toBeDisabled();
    expect(screen.queryByTestId('spell-unlock-wrong')).not.toBeInTheDocument();
    expect(props.onCancel).not.toHaveBeenCalled();
  });
});
