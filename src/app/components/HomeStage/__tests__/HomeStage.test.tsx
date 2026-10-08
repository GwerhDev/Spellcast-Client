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

  // With a spell loaded the scene stays at the top while the quick start rises over it, and
  // the corner (the altar's settings) stays in view over both; with nothing loaded it's an
  // ordinary page.
  it('immersive, the scene and its corner stay in view at the top; not otherwise', () => {
    const { rerender } = render(stage({ corner: <span data-testid="corner-btn" /> }));
    expect(screen.getByTestId('home-stage-main').className).not.toMatch(/mainSticky/);
    rerender(stage({ immersive: true, corner: <span data-testid="corner-btn" /> }));
    const main = screen.getByTestId('home-stage-main');
    expect(main.className).toMatch(/mainSticky/);
    expect(screen.getByTestId('home-stage-corner').parentElement!.className).toMatch(/cornerAnchorSticky/);
    expect(main).toContainElement(screen.getByTestId('main'));
    expect(main).not.toContainElement(screen.getByTestId('secondary'));
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

  // A long sentence on the altar runs past the scene: the content below makes room for it,
  // the scene keeping the height it fills the page with, so it doesn't rise.
  it('immersive, moves the secondary content down by the scene\'s overflow, keeping the scene\'s height', () => {
    const client = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(900);
    const offset = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
    onTestFinished(() => { client.mockRestore(); offset.mockRestore(); });
    const page = (props: Partial<React.ComponentProps<typeof HomeStage>>) => (
      <div style={{ overflowY: 'auto' }}>{stage(props)}</div>
    );
    const { rerender } = render(page({ immersive: true }));
    expect(screen.getByTestId('home-stage-secondary').style.marginTop).toBe('');
    expect(screen.getByTestId('home-stage-main').style.minHeight).toBe('');
    rerender(page({ immersive: true, sceneOverflow: 120 }));
    expect(screen.getByTestId('home-stage-secondary').style.marginTop).toBe('120px');
    expect(screen.getByTestId('home-stage-main').style.minHeight).toBe('600px');
    rerender(page({ immersive: false, sceneOverflow: 120 }));
    expect(screen.getByTestId('home-stage-secondary').style.marginTop).toBe('');
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
