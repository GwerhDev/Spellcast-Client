import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptySpellCard } from '../EmptySpellCard';

describe('EmptySpellCard', () => {
  it('is only a placeholder: hidden from assistive tech', () => {
    render(<EmptySpellCard testId="slot" />);
    expect(screen.getByTestId('slot')).toHaveAttribute('aria-hidden', 'true');
  });
});
