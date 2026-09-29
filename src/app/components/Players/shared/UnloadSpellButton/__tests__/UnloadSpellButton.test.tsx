import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnloadSpellButton } from '../UnloadSpellButton';

describe('UnloadSpellButton', () => {
  it('is labelled by its title and calls onClick', () => {
    const onClick = vi.fn();
    render(<UnloadSpellButton onClick={onClick} title="Unload spell" />);
    const button = screen.getByTestId('unload-spell-button');
    expect(button).toHaveAttribute('title', 'Unload spell');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});
