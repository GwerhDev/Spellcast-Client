import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeStage } from '../HomeStage';

const stage = (props: Partial<React.ComponentProps<typeof HomeStage>> = {}) => (
  <HomeStage coverUrl={null} idle={false} main={<div data-testid="main" />} secondary={<div data-testid="secondary" />} {...props} />
);

describe('HomeStage', () => {
  it('is a plain page without a cover: no backdrop, and the secondary content always shows', () => {
    render(stage({ idle: true }));
    expect(screen.getByTestId('main')).toBeInTheDocument();
    expect(screen.queryByTestId('home-stage-cover')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-stage-secondary').className).not.toMatch(/secondaryHidden/);
  });

  it('with a cover, takes it as the whole backdrop', () => {
    render(stage({ coverUrl: 'blob:cover' }));
    expect(screen.getByTestId('home-stage-cover').style.backgroundImage).toContain('blob:cover');
    expect(screen.getByTestId('home-stage').className).toMatch(/immersive/);
  });

  it('with a cover, the secondary content steps aside while idle', () => {
    const { rerender } = render(stage({ coverUrl: 'blob:cover', idle: false }));
    expect(screen.getByTestId('home-stage-secondary').className).not.toMatch(/secondaryHidden/);
    rerender(stage({ coverUrl: 'blob:cover', idle: true }));
    expect(screen.getByTestId('home-stage-secondary').className).toMatch(/secondaryHidden/);
    expect(screen.getByTestId('home-stage-secondary')).toHaveAttribute('aria-hidden', 'true');
  });
});
