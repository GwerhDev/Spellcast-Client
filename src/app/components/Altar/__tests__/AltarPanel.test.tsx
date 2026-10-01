import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AltarPanel } from '../AltarPanel';

const panel = (props: Partial<React.ComponentProps<typeof AltarPanel>> = {}) => (
  <AltarPanel coverUrl={null} highlighted={false} menuOpen={false} center={<span data-testid="center" />} footer={<span data-testid="footer" />} {...props} />
);

describe('AltarPanel', () => {
  it('renders its center and footer, transparent without a cover', () => {
    render(panel());
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('altar').className).toMatch(/noCover/);
    expect(screen.queryByTestId('altar-cover')).not.toBeInTheDocument();
  });

  it('fills with the cover when there is one', () => {
    render(panel({ coverUrl: 'blob:cover' }));
    expect(screen.getByTestId('altar-cover').style.backgroundImage).toContain('blob:cover');
    expect(screen.getByTestId('altar').className).toMatch(/hasCover/);
  });

  it('lights up while highlighted', () => {
    render(panel({ highlighted: true }));
    expect(screen.getByTestId('altar').className).toMatch(/dragActive/);
  });

  it('only renders the corner slots that have content', () => {
    const { rerender } = render(panel());
    expect(screen.queryByTestId('altar-corner-left')).not.toBeInTheDocument();
    expect(screen.queryByTestId('altar-corner-right')).not.toBeInTheDocument();
    rerender(panel({ leftCorner: <span data-testid="l" />, rightCorner: <span data-testid="r" /> }));
    expect(screen.getByTestId('altar-corner-left')).toContainElement(screen.getByTestId('l'));
    expect(screen.getByTestId('altar-corner-right')).toContainElement(screen.getByTestId('r'));
  });

  it('is the drop target: drag handlers are on the whole panel', () => {
    const onDrop = vi.fn();
    const onDragEnter = vi.fn();
    render(panel({ onDrop, onDragEnter }));
    fireEvent.dragEnter(screen.getByTestId('altar'));
    fireEvent.drop(screen.getByTestId('altar'));
    expect(onDragEnter).toHaveBeenCalled();
    expect(onDrop).toHaveBeenCalled();
  });

  it('immersive: no box or cover of its own (the page shows it), still lit up for drops', () => {
    render(panel({ coverUrl: 'blob:cover', immersive: true, highlighted: true }));
    expect(screen.queryByTestId('altar-cover')).not.toBeInTheDocument();
    expect(screen.getByTestId('altar').className).toMatch(/immersive/);
    expect(screen.getByTestId('altar').className).toMatch(/dragActive/);
  });

  // The light-on-cover colors are for over a cover: with none behind, on a light theme
  // they'd be light text on a light page.
  it('immersive without a cover keeps the page\'s own colors', () => {
    render(panel({ coverUrl: null, immersive: true }));
    expect(screen.getByTestId('altar').className).toMatch(/immersive/);
    expect(screen.getByTestId('altar').className).toMatch(/noCover/);
    expect(screen.getByTestId('altar').className).not.toMatch(/hasCover/);
  });
});
