import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerDock } from '../PlayerDock';

describe('PlayerDock', () => {
  it('renders nothing with no player unless asked to show the empty dock', () => {
    const { container, rerender } = render(<PlayerDock showEmpty={false} highlighted={false} hint="Drop here" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PlayerDock showEmpty highlighted={false} hint="Drop here" />);
    expect(screen.getByTestId('player-dock-empty')).toHaveTextContent('Drop here');
  });

  it('holds the player, with the drop hint over it only while highlighted', () => {
    const { rerender } = render(<PlayerDock showEmpty={false} highlighted={false} hint="Switch"><div data-testid="player" /></PlayerDock>);
    expect(screen.getByTestId('player')).toBeInTheDocument();
    expect(screen.queryByTestId('player-dock-overlay')).not.toBeInTheDocument();
    rerender(<PlayerDock showEmpty={false} highlighted hint="Switch"><div data-testid="player" /></PlayerDock>);
    expect(screen.getByTestId('player-dock-overlay')).toHaveTextContent('Switch');
    expect(screen.getByTestId('player-dock').className).toMatch(/highlighted/);
  });

  it('is the drop target', () => {
    const onDrop = vi.fn();
    render(<PlayerDock showEmpty highlighted={false} hint="Drop here" onDrop={onDrop} />);
    fireEvent.drop(screen.getByTestId('player-dock'));
    expect(onDrop).toHaveBeenCalled();
  });
});
