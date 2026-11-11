import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../IconButton';
import { spFullscreen } from '../../../../icons';

describe('IconButton', () => {
  it('draws a Font Awesome icon as it is, and calls back when clicked', () => {
    const onClick = vi.fn();
    render(<IconButton data-testid="icon-button" icon={faGear} title="Settings" onClick={onClick} />);
    expect(screen.queryByTestId('nav-icon-gear')).toBeNull();
    fireEvent.click(screen.getByTestId('icon-button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('draws one of our icons that moves in its parts, held as it is on hover while active', () => {
    const { rerender } = render(<IconButton icon={spFullscreen} title="Fullscreen" />);
    expect(screen.getByTestId('nav-icon-fullscreen')).not.toHaveAttribute('data-active');
    rerender(<IconButton icon={spFullscreen} title="Fullscreen" active />);
    expect(screen.getByTestId('nav-icon-fullscreen')).toHaveAttribute('data-active', 'true');
  });
});
