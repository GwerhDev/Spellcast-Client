import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { CopyButton } from '../index';

describe('CopyButton', () => {
  it('renders the copy button', () => {
    renderWithProviders(<CopyButton title="Copy" textToCopy="hello" />);
    expect(screen.getByTestId('copy-button')).toBeInTheDocument();
  });
});
