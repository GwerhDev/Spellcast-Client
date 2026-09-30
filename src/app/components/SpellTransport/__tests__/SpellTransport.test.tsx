import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpellTransport } from '../SpellTransport';

const labels = { mount: 'Load', unmount: 'Unload', play: 'Play', pause: 'Pause', previous: 'Previous page', next: 'Next page' };
const handlers = () => ({ onMount: vi.fn(), onUnmount: vi.fn(), onTogglePlay: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() });

describe('SpellTransport', () => {
  it('only offers loading the spell while it is not the loaded one', () => {
    const h = handlers();
    render(<SpellTransport mounted={false} isPlaying={false} canPrevious={false} canNext={false} labels={labels} {...h} />);
    expect(screen.queryByTestId('spell-transport-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('spell-transport-mount')).toHaveAttribute('title', 'Load');
    fireEvent.click(screen.getByTestId('spell-transport-mount'));
    expect(h.onMount).toHaveBeenCalled();
  });

  it('once loaded: previous page, play/pause, next page and unloading', () => {
    const h = handlers();
    render(<SpellTransport mounted isPlaying={false} canPrevious canNext labels={labels} {...h} />);
    expect(screen.queryByTestId('spell-transport-mount')).not.toBeInTheDocument();
    expect(screen.getByTestId('spell-transport-toggle')).toHaveAttribute('title', 'Play');
    fireEvent.click(screen.getByTestId('spell-transport-toggle'));
    fireEvent.click(screen.getByTestId('spell-transport-previous'));
    fireEvent.click(screen.getByTestId('spell-transport-next'));
    fireEvent.click(screen.getByTestId('spell-transport-unmount'));
    expect(h.onUnmount).toHaveBeenCalled();
    expect(h.onTogglePlay).toHaveBeenCalled();
    expect(h.onPrevious).toHaveBeenCalled();
    expect(h.onNext).toHaveBeenCalled();
  });

  it('shows pause while playing, and disables page steps at the edges', () => {
    render(<SpellTransport mounted isPlaying canPrevious={false} canNext labels={labels} {...handlers()} />);
    expect(screen.getByTestId('spell-transport-toggle')).toHaveAttribute('title', 'Pause');
    expect(screen.getByTestId('spell-transport-previous')).toBeDisabled();
    expect(screen.getByTestId('spell-transport-next')).not.toBeDisabled();
  });

  it('shares its row with the leading content', () => {
    render(<SpellTransport leading={<span data-testid="lead">3 pages</span>} mounted={false} isPlaying={false} canPrevious={false} canNext={false} labels={labels} {...handlers()} />);
    expect(screen.getByTestId('spell-transport')).toContainElement(screen.getByTestId('lead'));
  });
});
