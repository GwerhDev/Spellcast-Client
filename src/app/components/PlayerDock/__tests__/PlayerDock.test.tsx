import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PlayerDock } from '../PlayerDock';

describe('PlayerDock', () => {
  it('renders nothing with no player unless asked to show the empty dock', () => {
    const { rerender } = render(<PlayerDock showEmpty={false} highlighted={false} hint="Drop here" />);
    expect(screen.queryByTestId('player-dock')).not.toBeInTheDocument();
    rerender(<PlayerDock showEmpty highlighted={false} hint="Drop here" />);
    expect(screen.getByTestId('player-dock-empty')).toHaveTextContent('Drop here');
  });

  // Out of the layout's flow entirely, so appearing mid-drag can't resize or add a scrollbar
  // to the page it's rendered from.
  it('floats the empty dock over the page (portaled to body), outside where it is rendered', () => {
    const { container } = render(<div data-testid="host"><PlayerDock showEmpty highlighted={false} hint="Drop here" /></div>);
    expect(screen.getByTestId('player-dock').parentElement).toBe(document.body);
    expect(container.querySelector('[data-testid="player-dock"]')).toBeNull();
  });

  it('keeps the loaded player where it is rendered', () => {
    render(<div data-testid="host"><PlayerDock showEmpty={false} highlighted={false} hint="Switch"><div data-testid="player" /></PlayerDock></div>);
    // In the layout's flow, inside the slot that opens its place there.
    expect(screen.getByTestId('player-dock-slot').parentElement).toBe(screen.getByTestId('host'));
    expect(screen.getByTestId('player-dock').parentElement).toBe(screen.getByTestId('player-dock-slot'));
  });

  it('opens its place when a player is loaded, and closes it once unloaded', async () => {
    const { rerender } = render(<PlayerDock showEmpty={false} highlighted={false} hint="Switch" />);
    expect(screen.queryByTestId('player-dock-slot')).not.toBeInTheDocument();
    rerender(<PlayerDock showEmpty={false} highlighted={false} hint="Switch"><div data-testid="player" /></PlayerDock>);
    expect(screen.getByTestId('player-dock-slot')).toBeInTheDocument();
    rerender(<PlayerDock showEmpty={false} highlighted={false} hint="Switch" />);
    await waitFor(() => expect(screen.queryByTestId('player-dock-slot')).not.toBeInTheDocument());
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
