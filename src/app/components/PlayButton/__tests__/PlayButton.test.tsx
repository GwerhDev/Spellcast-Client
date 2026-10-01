import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayButton, PlayButtonShape } from '../PlayButton';

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

  it('uses the title as tooltip and accessible name', () => {
    render(<PlayButton isPlaying={false} onClick={vi.fn()} title="Open a file" />);
    expect(screen.getByTestId('play-button')).toHaveAttribute('title', 'Open a file');
    expect(screen.getByTestId('play-button')).toHaveAttribute('aria-label', 'Open a file');
  });

  it('announces a menu it opens, and whether it is open', () => {
    const { rerender } = render(<PlayButton isPlaying={false} onClick={vi.fn()} hasPopup="menu" expanded={false} controls="m1" />);
    const button = screen.getByTestId('play-button');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'm1');
    rerender(<PlayButton isPlaying={false} onClick={vi.fn()} hasPopup="menu" expanded controls="m1" />);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('as a plain play button, has no menu attributes', () => {
    render(<PlayButton isPlaying={false} onClick={vi.fn()} />);
    const button = screen.getByTestId('play-button');
    expect(button).not.toHaveAttribute('aria-haspopup');
    expect(button).not.toHaveAttribute('aria-expanded');
  });
});

describe('PlayButtonShape', () => {
  it('is only the look: the play mark, not a button', () => {
    render(<PlayButtonShape size="lg" active />);
    const shape = screen.getByTestId('play-button-shape');
    expect(shape.tagName).toBe('SPAN');
    expect(shape).toHaveAttribute('aria-hidden', 'true');
    expect(shape.querySelector('[data-icon="play"]')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
