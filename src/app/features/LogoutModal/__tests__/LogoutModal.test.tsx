import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { LogoutModal } from '../index';

vi.mock('../../../../services/auth', () => ({ fetchLogout: vi.fn() }));

describe('LogoutModal', () => {
  it('renders the logout modal container', () => {
    renderWithProviders(<LogoutModal />);
    expect(screen.getByTestId('logout-modal')).toBeInTheDocument();
  });
});
