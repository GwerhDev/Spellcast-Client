import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerConfigButton } from '../PlayerConfigButton';

describe('PlayerConfigButton', () => {
  it('renders and fires onClick', () => {
    const onClick = vi.fn();
    render(<PlayerConfigButton onClick={onClick} />);
    fireEvent.click(screen.getByTestId('player-config-button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
