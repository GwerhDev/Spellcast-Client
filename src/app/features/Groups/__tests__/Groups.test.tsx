import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Groups } from '../index';

describe('Groups', () => {
  it('renders the groups container', () => {
    renderWithProviders(<Groups />);
    expect(screen.getByTestId('groups')).toBeInTheDocument();
  });

  it('shows add button when not loading', () => {
    renderWithProviders(<Groups />);
    expect(screen.getByTestId('groups-add')).toBeInTheDocument();
  });
});
