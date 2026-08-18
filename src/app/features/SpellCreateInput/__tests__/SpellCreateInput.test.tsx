import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellCreateInput } from '../index';
import { SpellState } from '../../../../interfaces';

const mockDoc: SpellState = {
  title: 'Test',
  fileContent: null,
  size: 0,
  totalPages: 0,
  currentPage: 0,
  isLoaded: false,
};

describe('SpellCreateInput', () => {
  it('renders the input container', () => {
    renderWithProviders(<SpellCreateInput spell={mockDoc} />);
    expect(screen.getByTestId('spell-create-input')).toBeInTheDocument();
  });
});
