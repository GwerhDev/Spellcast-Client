import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { AccountMenu } from '../index';

describe('AccountMenu', () => {
  it('renders the account menu trigger', () => {
    renderWithProviders(<AccountMenu />);
    expect(screen.getByTestId('account-menu')).toBeInTheDocument();
  });
});
