import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanionOverlay } from '../CompanionOverlay';
import type { Companion } from '../../../../config/assets';

// jsdom has no WebGL context — Canvas/r3f internals aren't under test here, only that
// CompanionOverlay wires the resolved companion's models into the render tree correctly.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-canvas">{children}</div>,
}));

vi.mock('../CatModel', () => ({
  CatModel: ({ color }: { color: string }) => <div data-testid="mock-cat" data-color={color} />,
}));

const companion: Companion = {
  id: 'cats',
  name: 'Cats',
  description: 'A pair of cats',
  category: 'companion',
  unlockMethod: 'free',
  models: [
    { id: 'orange', color: '#e0793c' },
    { id: 'black', color: '#2b2b2b' },
  ],
  thumbnail: '#000',
  tags: [],
};

describe('CompanionOverlay', () => {
  it('renders without crashing', () => {
    render(<CompanionOverlay companion={companion} />);
    expect(screen.getByTestId('companion-overlay')).toBeInTheDocument();
  });

  it('renders one CatModel per model in the companion', () => {
    render(<CompanionOverlay companion={companion} />);
    expect(screen.getAllByTestId('mock-cat')).toHaveLength(2);
  });

  it('passes each model color through to CatModel', () => {
    render(<CompanionOverlay companion={companion} />);
    const cats = screen.getAllByTestId('mock-cat');
    expect(cats[0]).toHaveAttribute('data-color', '#e0793c');
    expect(cats[1]).toHaveAttribute('data-color', '#2b2b2b');
  });
});
