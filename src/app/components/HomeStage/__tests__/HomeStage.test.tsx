import { describe, it, expect } from 'vitest';
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
});
