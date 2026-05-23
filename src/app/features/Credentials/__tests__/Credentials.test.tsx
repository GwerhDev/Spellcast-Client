import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Credentials } from '../index';

describe('Credentials', () => {
  it('renders the credentials container', () => {
    renderWithProviders(<Credentials />);
    expect(screen.getByTestId('credentials')).toBeInTheDocument();
  });

  it('shows add button when not loading', () => {
    renderWithProviders(<Credentials />);
    expect(screen.getByTestId('credentials-add')).toBeInTheDocument();
  });
});
