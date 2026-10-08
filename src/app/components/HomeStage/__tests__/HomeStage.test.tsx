import { describe, it, expect, vi, onTestFinished } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeStage } from '../HomeStage';

const stage = (props: Partial<React.ComponentProps<typeof HomeStage>> = {}) => (
  <HomeStage coverUrl={null} immersive={false} idle={false} main={<div data-testid="main" />} secondary={<div data-testid="secondary" />} {...props} />
);

describe('HomeStage', () => {
  it('with nothing loaded is a plain page: no backdrop, and the secondary content always shows', () => {
    render(stage({ idle: true }));
    expect(screen.getByTestId('main')).toBeInTheDocument();
    expect(screen.queryByTestId('home-stage-cover')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-stage-secondary').className).not.toMatch(/secondaryHidden/);
  });

  it('with a cover, takes it as the whole backdrop', () => {
    render(stage({ coverUrl: 'blob:cover', immersive: true }));
    expect(screen.getByTestId('home-stage-cover').style.backgroundImage).toContain('blob:cover');
    expect(screen.getByTestId('home-stage').className).toMatch(/immersive/);
  });

  it('immersive, the secondary content steps aside while idle', () => {
    const { rerender } = render(stage({ coverUrl: 'blob:cover', immersive: true, idle: false }));
    expect(screen.getByTestId('home-stage-secondary').className).not.toMatch(/secondaryHidden/);
    rerender(stage({ coverUrl: 'blob:cover', immersive: true, idle: true }));
    expect(screen.getByTestId('home-stage-secondary').className).toMatch(/secondaryHidden/);
    // inert (not aria-hidden): hidden from assistive technology and takes focus out of it.
    expect(screen.getByTestId('home-stage-secondary')).toHaveAttribute('inert');
    expect(screen.getByTestId('home-stage-secondary')).not.toHaveAttribute('aria-hidden');
  });

  it('immersive without a cover: no backdrop, the rest the same', () => {
    render(stage({ immersive: true, idle: true }));
    expect(screen.queryByTestId('home-stage-cover')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-stage').className).toMatch(/immersive/);
    expect(screen.getByTestId('home-stage-secondary').className).toMatch(/secondaryHidden/);
  });

  // A keyboard user moving through it isn't touching the pointer: it stays while they're in it.
  it('immersive and idle, keeps the secondary content while it has keyboard focus', () => {
    const { rerender } = render(stage({ immersive: true, idle: false, secondary: <button data-testid="card">card</button> }));
    const card = screen.getByTestId('card');
    card.matches = ((sel: string) => sel === ':focus-visible') as typeof card.matches;
    fireEvent.focus(card);
    rerender(stage({ immersive: true, idle: true, secondary: <button data-testid="card">card</button> }));
    expect(screen.getByTestId('home-stage-secondary').className).not.toMatch(/secondaryHidden/);
    expect(screen.getByTestId('home-stage-secondary')).not.toHaveAttribute('inert');

    fireEvent.blur(card, { relatedTarget: document.body });
    expect(screen.getByTestId('home-stage-secondary')).toHaveAttribute('inert');
  });

  // A card clicked keeps focus too, but that's not someone navigating it: it still steps aside.
  it('immersive and idle, steps aside even with a clicked (not keyboard) card focused', () => {
    render(stage({ immersive: true, idle: true, secondary: <button data-testid="card">card</button> }));
    const card = screen.getByTestId('card');
    card.matches = (() => false) as typeof card.matches;
    fireEvent.focus(card);
    expect(screen.getByTestId('home-stage-secondary')).toHaveAttribute('inert');
  });

  // With a spell loaded the secondary content is docked at the bottom of the view, peeking,
  // and the corner (the altar's settings) stays in view at the top; with nothing loaded it's
  // an ordinary page.
  it('immersive, the secondary content is docked and the corner stays in view; not otherwise', () => {
    const { rerender } = render(stage({ corner: <span data-testid="corner-btn" /> }));
    expect(screen.getByTestId('home-stage-secondary')).not.toHaveAttribute('data-docked');
    rerender(stage({ immersive: true, corner: <span data-testid="corner-btn" /> }));
    expect(screen.getByTestId('home-stage-secondary')).toHaveAttribute('data-docked');
    expect(screen.getByTestId('home-stage-secondary').className).toMatch(/dock/);
    expect(screen.getByTestId('home-stage-corner').parentElement!.className).toMatch(/cornerAnchorSticky/);
    expect(screen.getByTestId('home-stage-main')).not.toContainElement(screen.getByTestId('secondary'));
  });

  // Peeking, three quarters of its peeking part show: it sits down by what's below that part
  // and a quarter of it, and the scene leaves the part that shows free.
  it('docked, peeks three quarters of its peeking part, the scene leaving that much free', () => {
    const offset = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const bottom = this.hasAttribute('data-dock-peek') ? 584 : 600;
      return { top: 0, bottom, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
    onTestFinished(() => { offset.mockRestore(); rect.mockRestore(); });
    render(stage({ immersive: true, secondary: <div><div data-dock-reveal /><div data-dock-peek /></div> }));
    expect(screen.getByTestId('home-stage-secondary').style.getPropertyValue('--dock-hidden')).toBe('66px');
    expect(screen.getByTestId('home-stage-main').style.paddingBottom).toBe('150px');
  });

  // The cover stays put while the page scrolls: its layer is as tall as what the page shows.
  it('the cover layer is as tall as the page\'s visible area', () => {
    const height = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(640);
    onTestFinished(() => height.mockRestore());
    render(
      <div style={{ overflowY: 'auto' }}>
        {stage({ coverUrl: 'blob:cover', immersive: true })}
      </div>,
    );
    expect(screen.getByTestId('home-stage-attached').style.height).toBe('640px');
  });

  it('with no scrolling page around it, the cover layer is the window\'s height', () => {
    render(stage({ coverUrl: 'blob:cover', immersive: true }));
    expect(screen.getByTestId('home-stage-attached').style.height).toBe('100vh');
  });

  // A long sentence on the altar runs past the scene: the page gets that much longer below
  // it (scrolling down to the rest of it), the scene keeping its place.
  it('immersive, makes room below the scene for its overflow', () => {
    const { rerender } = render(stage({ immersive: true }));
    expect(screen.getByTestId('home-stage-main').style.marginBottom).toBe('0px');
    rerender(stage({ immersive: true, sceneOverflow: 120 }));
    expect(screen.getByTestId('home-stage-main').style.marginBottom).toBe('120px');
    rerender(stage({ immersive: false, sceneOverflow: 120 }));
    expect(screen.getByTestId('home-stage-main').style.marginBottom).toBe('');
  });

  it('draws a layer over the stage, raised over the scene when asked', () => {
    const { rerender } = render(stage({ layer: <div data-testid="scene" /> }));
    const layer = screen.getByTestId('home-stage-layer');
    expect(layer).toContainElement(screen.getByTestId('scene'));
    expect(layer.className).not.toMatch(/layerRaised/);
    rerender(stage({ layer: <div data-testid="scene" />, layerRaised: true }));
    expect(screen.getByTestId('home-stage-layer').className).toMatch(/layerRaised/);
  });

  it('draws no layer without one', () => {
    render(stage());
    expect(screen.queryByTestId('home-stage-layer')).not.toBeInTheDocument();
  });
});
