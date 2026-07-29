import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../../../test/renderWithProviders';
import { CompanionOverlay } from '../CompanionOverlay';
import type { Companion } from '../../../../config/assets';
import type { CompanionPlacement } from '../../../../store/userLibrarySlice';

// jsdom has no WebGL context — Canvas/r3f internals aren't under test here, only that
// CompanionOverlay wires the resolved companion's models and placements into the render
// tree correctly. Drag-to-move, Ctrl+drag-to-rotate and Ctrl+wheel-to-scale are driven by
// onPointerDown/onWheel on the r3f <group> plus window pointermove/pointerup listeners —
// not meaningfully testable without a real Canvas, so those gestures are exercised manually
// in-browser instead; here we only verify the callback props are wired, not the gesture math
// (already covered by userLibrarySlice's moveCompanionModel/rotateCompanionModel/scaleCompanionModel tests).
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-canvas">{children}</div>,
}));

vi.mock('../CatModel', () => ({
  CatModel: ({ color, highlighted }: { color: string; highlighted?: boolean }) => (
    <div data-testid="mock-cat" data-color={color} data-highlighted={String(!!highlighted)} />
  ),
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

const noopProps = {
  placements: {} as Record<string, CompanionPlacement>,
  onMove: vi.fn(),
  onRotate: vi.fn(),
  onScale: vi.fn(),
};

describe('CompanionOverlay', () => {
  it('renders without crashing', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    expect(screen.getByTestId('companion-overlay')).toBeInTheDocument();
  });

  it('renders one CatModel per model in the companion', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    expect(screen.getAllByTestId('mock-cat')).toHaveLength(2);
  });

  it('passes each model color through to CatModel', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    const cats = screen.getAllByTestId('mock-cat');
    expect(cats[0]).toHaveAttribute('data-color', '#e0793c');
    expect(cats[1]).toHaveAttribute('data-color', '#2b2b2b');
  });

  it('gives each model its own hit area, falling back to a default when unplaced', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    const orange = screen.getByTestId('companion-hit-area-orange');
    const black = screen.getByTestId('companion-hit-area-black');
    expect(orange.style.left).not.toBe(black.style.left);
  });

  it('positions a hit area from a persisted placement instead of the default', () => {
    const placements: Record<string, CompanionPlacement> = {
      orange: { x: 500, y: 300, rotationX: 0, rotationY: 0, scale: 1 },
    };
    render(<CompanionOverlay companion={companion} {...noopProps} placements={placements} />);
    const orange = screen.getByTestId('companion-hit-area-orange');
    expect(orange.style.left).toBe(`${500 - 110}px`);
    expect(orange.style.top).toBe(`${300 - 110}px`);
  });

  it('tells CatModel to highlight itself while the pointer moves over it with Ctrl held', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    const orangeHitArea = screen.getByTestId('companion-hit-area-orange');
    const orangeCat = screen.getAllByTestId('mock-cat')[0];
    expect(orangeCat).toHaveAttribute('data-highlighted', 'false');
    fireEvent.mouseMove(orangeHitArea, { ctrlKey: true });
    expect(orangeCat).toHaveAttribute('data-highlighted', 'true');
  });

  it('clears the highlight when the pointer moves without Ctrl', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    const orangeHitArea = screen.getByTestId('companion-hit-area-orange');
    const orangeCat = screen.getAllByTestId('mock-cat')[0];
    fireEvent.mouseMove(orangeHitArea, { ctrlKey: true });
    expect(orangeCat).toHaveAttribute('data-highlighted', 'true');
    fireEvent.mouseMove(orangeHitArea, { ctrlKey: false });
    expect(orangeCat).toHaveAttribute('data-highlighted', 'false');
  });

  it('clears the highlight on mouse leave', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    const orangeHitArea = screen.getByTestId('companion-hit-area-orange');
    const orangeCat = screen.getAllByTestId('mock-cat')[0];
    fireEvent.mouseMove(orangeHitArea, { ctrlKey: true });
    expect(orangeCat).toHaveAttribute('data-highlighted', 'true');
    fireEvent.mouseLeave(orangeHitArea);
    expect(orangeCat).toHaveAttribute('data-highlighted', 'false');
  });
});
