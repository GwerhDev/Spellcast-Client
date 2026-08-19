import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders as render } from '../../../../test/renderWithProviders';
import { CompanionOverlay } from '../CompanionOverlay';
import type { Companion } from '../../../../config/assets';
import type { CompanionPlacement } from '../../../../store/userLibrarySlice';

// The DOM env has no WebGL context — r3f internals aren't under test here, only that
// CompanionOverlay wires the resolved companion's models/placements into the render tree and
// routes Ctrl-hover state to the right model. The overlay renders ONE shared <Canvas> (mocked
// to render its children as DOM) plus a per-model HTML hit box on top; gestures are driven by
// pointer/wheel listeners on those hit boxes and window pointermove/pointerup — the gesture
// math itself is covered by userLibrarySlice's move/rotate/scale reducer tests, so here we
// only assert prop wiring and the hover→highlight routing.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-canvas">{children}</div>,
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

// The overlay only mounts its <Canvas> once it has measured a non-zero size (so the
// orthographic pixel camera has a real frustum). The test DOM reports clientWidth/Height as 0,
// so stub them to a fixed size for the duration of these tests; without this the Canvas — and
// the models inside it — would never render.
const OVERLAY_W = 800;
const OVERLAY_H = 600;
let widthSpy: ReturnType<typeof vi.spyOn>;
let heightSpy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  widthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(OVERLAY_W);
  heightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(OVERLAY_H);
});
afterAll(() => {
  widthSpy.mockRestore();
  heightSpy.mockRestore();
});

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

  it('renders a single shared canvas, not one per model', () => {
    render(<CompanionOverlay companion={companion} {...noopProps} />);
    expect(screen.getAllByTestId('mock-canvas')).toHaveLength(1);
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
    // Hit box is centered on the placement: 220px box → offset by half (110px).
    expect(orange.style.left).toBe(`${500 - 110}px`);
    expect(orange.style.top).toBe(`${300 - 110}px`);
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
