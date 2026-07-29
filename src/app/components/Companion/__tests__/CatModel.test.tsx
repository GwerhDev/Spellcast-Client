import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import * as THREE from 'three';
import { CatModel } from '../CatModel';

// useGLTF/useAnimations need a real WebGL/loader pipeline — mock the loaded shape.
// A real THREE.Mesh (not a plain object) so Box3.setFromObject's traversal works.
const mockAnimationAction = { reset: vi.fn(), fadeIn: vi.fn(), fadeOut: vi.fn(), play: vi.fn() };
mockAnimationAction.reset.mockReturnValue(mockAnimationAction);
mockAnimationAction.fadeIn.mockReturnValue(mockAnimationAction);

const mockScene = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 8));

vi.mock('@react-three/drei', () => ({
  useGLTF: () => ({ scene: mockScene, animations: ['walk'] }),
  useAnimations: () => ({ actions: { walk: mockAnimationAction }, names: ['walk'] }),
}));

describe('CatModel', () => {
  it('renders without crashing', () => {
    expect(() => render(<CatModel color="#e0793c" />)).not.toThrow();
  });

  it('renders the placeholder capsule when no modelUrl is given', () => {
    const { container } = render(<CatModel color="#e0793c" />);
    expect(container.querySelector('mesh')).not.toBeNull();
  });

  it('plays the glTF animation clip in place when modelUrl is given', () => {
    render(<CatModel color="#2b2b2b" modelUrl="/models/cats/black/scene.gltf" />);
    expect(mockAnimationAction.play).toHaveBeenCalled();
  });

  it('normalizes an oversized model down to the target on-screen size', () => {
    const { container } = render(<CatModel color="#2b2b2b" modelUrl="/models/cats/black/scene.gltf" />);
    // Mocked model's largest bounding-box dimension is 40 (BoxGeometry(40, 20, 8)); the
    // wrapping <group> should carry a corrective scale, not render it at native size.
    const groups = container.querySelectorAll('group');
    const scaledGroup = Array.from(groups).find(g => g.getAttribute('scale') && g.getAttribute('scale') !== '1');
    expect(scaledGroup).toBeDefined();
  });

  it('draws no in-scene outline by default', () => {
    const { container } = render(<CatModel color="#e0793c" />);
    expect(container.querySelector('linesegments')).toBeNull();
  });

  it('draws an in-scene outline around the placeholder capsule when highlighted', () => {
    const { container } = render(<CatModel color="#e0793c" highlighted />);
    expect(container.querySelector('linesegments')).not.toBeNull();
  });

  it('draws an in-scene outline around the glTF model when highlighted', () => {
    const { container } = render(<CatModel color="#2b2b2b" modelUrl="/models/cats/black/scene.gltf" highlighted />);
    expect(container.querySelector('linesegments')).not.toBeNull();
  });
});
