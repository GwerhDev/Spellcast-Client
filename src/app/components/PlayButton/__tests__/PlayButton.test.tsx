import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayButton } from '../PlayButton';

describe('PlayButton', () => {
  it('calls onClick', () => {
    const onClick = vi.fn();
    render(<PlayButton isPlaying={false} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('play-button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders a custom icon instead of play/pause when given one', () => {
    render(<PlayButton isPlaying={false} onClick={vi.fn()} icon={<span data-testid="custom-icon" />} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('when idle, is not disabled but marked aria-disabled and ignores clicks', () => {
    const onClick = vi.fn();
    render(<PlayButton isPlaying={false} onClick={onClick} idle />);
    const button = screen.getByTestId('play-button');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
