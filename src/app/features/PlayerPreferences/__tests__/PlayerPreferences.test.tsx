import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { PlayerPreferences } from '../index';

describe('PlayerPreferences', () => {
  it('renders the player preferences container', () => {
    renderWithProviders(<PlayerPreferences />);
    expect(screen.getByTestId('player-preferences')).toBeInTheDocument();
  });
});
