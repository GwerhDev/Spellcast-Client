import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Start } from '../index';

// ImportOption uses pdfjs-dist (DOMMatrix not in jsdom)
vi.mock('../ImportOption', () => ({
  ImportOption: () => null,
}));
// TextOption uses window.speechSynthesis (not in jsdom)
vi.mock('../TextOption', () => ({
  TextOption: () => null,
}));

describe('Start', () => {
  it('renders start container', () => {
    renderWithProviders(<Start />);
    expect(screen.getByTestId('start')).toBeInTheDocument();
  });
});
