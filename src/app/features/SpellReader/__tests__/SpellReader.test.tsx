import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellReader } from '../index';

// MagicTextEditor / TTSSpellReader use browser APIs not available in jsdom
vi.mock('../../../../magictext', () => ({
  MagicTextEditor: () => null,
  TTSSpellReader: () => null,
}));

describe('SpellReader', () => {
  it('renders the reader container', () => {
    renderWithProviders(<SpellReader />);
    expect(screen.getByTestId('spell-reader')).toBeInTheDocument();
  });

  it('shows loading state when document is not loaded', () => {
    renderWithProviders(<SpellReader />);
    // Default spellReader state has isLoaded = false
    expect(screen.getByTestId('spell-reader-loading')).toBeInTheDocument();
  });
});
