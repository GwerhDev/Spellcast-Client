import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SearcherButton } from '../index';

describe('SearcherButton', () => {
  it('renders the searcher button', () => {
    renderWithProviders(<SearcherButton />);
    expect(screen.getByTestId('searcher-button')).toBeInTheDocument();
  });
});
