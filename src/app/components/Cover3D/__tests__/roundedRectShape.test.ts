import { describe, it, expect } from 'vitest';
import { roundedRectShape } from '../roundedRectShape';

// Pure geometry -- no WebGL needed (matches CLAUDE.md's "what NOT to test": third-party
// rendering internals, not this). THREE.Shape's own `getPoints()` traces its outline as
// Vector2s, which is enough to verify bounds and actual rounding without a renderer.

describe('roundedRectShape', () => {
  it('produces an outline whose bounding box matches the requested width/height, centered at the origin', () => {
    const shape = roundedRectShape(200, 100, 8);
    const points = shape.getPoints(32);
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    expect(Math.max(...xs)).toBeCloseTo(100, 1);
    expect(Math.min(...xs)).toBeCloseTo(-100, 1);
    expect(Math.max(...ys)).toBeCloseTo(50, 1);
    expect(Math.min(...ys)).toBeCloseTo(-50, 1);
  });

  it('actually rounds the corners -- no sampled point sits at the sharp mathematical corner', () => {
    const width = 160;
    const height = 240;
    const radius = 8;
    const shape = roundedRectShape(width, height, radius);
    const points = shape.getPoints(64);
    const sharpCorner = { x: width / 2, y: height / 2 };
    const minDistanceToSharpCorner = Math.min(
      ...points.map(p => Math.hypot(p.x - sharpCorner.x, p.y - sharpCorner.y)),
    );
    // A true rounded corner never reaches the sharp corner point -- the closest the curve
    // gets is bounded below by roughly the radius itself (Pythagorean shortfall of a 90°
    // arc), so any distance meaningfully above 0 confirms rounding actually happened.
    expect(minDistanceToSharpCorner).toBeGreaterThan(radius * 0.2);
  });

  it('collapses to a plain sharp rectangle when radius is 0', () => {
    const width = 100;
    const height = 60;
    const shape = roundedRectShape(width, height, 0);
    const points = shape.getPoints(32);
    const sharpCorner = { x: width / 2, y: height / 2 };
    const minDistanceToSharpCorner = Math.min(
      ...points.map(p => Math.hypot(p.x - sharpCorner.x, p.y - sharpCorner.y)),
    );
    expect(minDistanceToSharpCorner).toBeCloseTo(0, 1);
  });

  it('clamps a radius larger than half the box instead of self-intersecting', () => {
    // width/height give half-extents of 20/15 -- a radius of 100 would otherwise push the
    // curve's control points past the shape's own center on both axes.
    const shape = roundedRectShape(40, 30, 100);
    const points = shape.getPoints(32);
    // Every sampled point must still stay within the requested box -- proof the radius was
    // actually clamped rather than producing an oversized/self-intersecting outline.
    for (const p of points) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(20.01);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(15.01);
    }
  });
});
