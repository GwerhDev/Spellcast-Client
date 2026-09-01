import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../../../test/renderWithProviders';
import { CompanionOverlay } from '../CompanionOverlay';
import type { Companion } from '../../../../config/assets';
import type { CompanionPlacement } from '../../../../store/casterInventorySlice';

// The DOM env has no WebGL context — r3f internals aren't under test here, only that
// CompanionOverlay wires the resolved companion's models/placements into the render tree and
// routes Ctrl-hover state to the right model. Each model gets its own small <Canvas> (mocked
// to render its children as DOM) so it can occlude/be occluded by the reader's page
// individually via real CSS z-index (see PAGE_Z_INDEX in CompanionOverlay.tsx), plus a
// per-model HTML hit box on top; gestures are driven by pointer/wheel listeners on those hit
// boxes and window pointermove/pointerup — the gesture math itself is covered by
// casterInventorySlice's move/rotate/scale/toggleCompanionDepth reducer tests, so here we only
// assert prop wiring and the hover→highlight routing.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid={props['data-testid'] ?? 'mock-canvas'}>{children}</div>
  ),
  // The overlay drives its on-demand render loop via useThree(state => state.invalidate);
  // the selector form must return a callable.
  useThree: (selector?: (state: { invalidate: () => void }) => unknown) => {
    const state = { invalidate: () => {} };
    return selector ? selector(state) : state;
  },
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
  onToggleDepth: vi.fn(),
};

describe('CompanionOverlay', () => {
  it('renders without crashing', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    expect(screen.getByTestId('companion-overlay')).toBeInTheDocument();
  });

  it('renders one canvas per model, not a single shared one', () => {
    // Each model needs its own stacking-context layer to occlude/be occluded by the page
    // individually (see PAGE_Z_INDEX in CompanionOverlay.tsx) -- a single shared canvas
    // can't do that, since it's one flat sheet of pixels either entirely in front of or
    // entirely behind any given HTML element.
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    expect(screen.getByTestId('companion-canvas-orange')).toBeInTheDocument();
    expect(screen.getByTestId('companion-canvas-black')).toBeInTheDocument();
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
      orange: { x: 500, y: 300, rotationX: 0, rotationY: 0, scale: 1, inFront: true },
    };
    render(<CompanionOverlay companion={companion} {...noopProps} placements={placements} />);
    const orange = screen.getByTestId('companion-hit-area-orange');
    // Hit box is centered on the placement: 220px box → offset by half (110px).
    expect(orange.style.left).toBe(`${500 - 110}px`);
    expect(orange.style.top).toBe(`${300 - 110}px`);
  });

  it('puts a hit area above the page z-index when in front, below when sent behind', () => {
    const placements: Record<string, CompanionPlacement> = {
      orange: { x: 500, y: 300, rotationX: 0, rotationY: 0, scale: 1, inFront: true },
      black: { x: 700, y: 300, rotationX: 0, rotationY: 0, scale: 1, inFront: false },
    };
    render(<CompanionOverlay companion={companion} {...noopProps} placements={placements} />);
    const orangeZ = Number(screen.getByTestId('companion-hit-area-orange').style.zIndex);
    const blackZ = Number(screen.getByTestId('companion-hit-area-black').style.zIndex);
    expect(orangeZ).toBeGreaterThan(blackZ);
  });

  it('highlights the model whose hit box the pointer moves over with Ctrl held', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    const orangeHitArea = screen.getByTestId('companion-hit-area-orange');
    // Orange is the first model, so its rendered CatModel is the first mock-cat.
    expect(screen.getAllByTestId('mock-cat')[0]).toHaveAttribute('data-highlighted', 'false');
    fireEvent.mouseMove(orangeHitArea, { ctrlKey: true });
    expect(screen.getAllByTestId('mock-cat')[0]).toHaveAttribute('data-highlighted', 'true');
    // Only the hovered model highlights, not the other one.
    expect(screen.getAllByTestId('mock-cat')[1]).toHaveAttribute('data-highlighted', 'false');
  });

  it('clears the highlight when the pointer moves without Ctrl', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    const orangeHitArea = screen.getByTestId('companion-hit-area-orange');
    fireEvent.mouseMove(orangeHitArea, { ctrlKey: true });
    expect(screen.getAllByTestId('mock-cat')[0]).toHaveAttribute('data-highlighted', 'true');
    fireEvent.mouseMove(orangeHitArea, { ctrlKey: false });
    expect(screen.getAllByTestId('mock-cat')[0]).toHaveAttribute('data-highlighted', 'false');
  });

  it('clears the highlight on mouse leave', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    const orangeHitArea = screen.getByTestId('companion-hit-area-orange');
    fireEvent.mouseMove(orangeHitArea, { ctrlKey: true });
    expect(screen.getAllByTestId('mock-cat')[0]).toHaveAttribute('data-highlighted', 'true');
    fireEvent.mouseLeave(orangeHitArea);
    expect(screen.getAllByTestId('mock-cat')[0]).toHaveAttribute('data-highlighted', 'false');
  });
});
