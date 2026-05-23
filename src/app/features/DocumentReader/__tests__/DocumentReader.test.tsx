import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { DocumentReader } from '../index';

// MagicTextEditor uses browser APIs not available in jsdom
vi.mock('../../../../magictext', () => ({
  MagicTextEditor: () => null,
}));

describe('DocumentReader', () => {
  it('renders the reader container', () => {
    renderWithProviders(<DocumentReader />);
    expect(screen.getByTestId('document-reader')).toBeInTheDocument();
  });

  it('shows loading state when document is not loaded', () => {
    renderWithProviders(<DocumentReader />);
    // Default pdfReader state has isLoaded = false
    expect(screen.getByTestId('document-reader-loading')).toBeInTheDocument();
  });
});
