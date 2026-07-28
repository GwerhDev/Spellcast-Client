import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CatModel } from '../CatModel';

// useFrame requires an active r3f <Canvas> render loop, which jsdom can't provide.
// Capture the callback instead so the wander logic itself stays testable without WebGL.
let frameCallback: ((state: unknown, delta: number) => void) | null = null;
vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: (state: unknown, delta: number) => void) => { frameCallback = cb; },
}));

describe('CatModel', () => {
  it('renders without crashing', () => {
    expect(() => render(<CatModel color="#e0793c" />)).not.toThrow();
  });

  it('registers a useFrame callback for its wander logic', () => {
    frameCallback = null;
    render(<CatModel color="#2b2b2b" />);
    expect(frameCallback).toBeInstanceOf(Function);
  });

  it('running the frame callback does not throw', () => {
    frameCallback = null;
    render(<CatModel color="#e0793c" speed={1} />);
    expect(() => frameCallback?.({}, 0.016)).not.toThrow();
  });
});
