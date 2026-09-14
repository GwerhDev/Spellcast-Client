import { describe, it, expect } from 'vitest';
import { computeCoverUV } from '../computeCoverUV';

// Pure math -- no texture/WebGL needed. Mirrors CSS `object-fit: cover;
// object-position: top`: crop whichever axis is relatively longer than the target box,
// center horizontally, anchor the kept band to the image's own top vertically.

describe('computeCoverUV', () => {
  it('never repeats past 1 on either axis (never stretches the image)', () => {
    expect(computeCoverUV(2, 1)).toMatchObject({ repeatX: 0.5, repeatY: 1 });
    expect(computeCoverUV(1, 2)).toMatchObject({ repeatX: 1, repeatY: 0.5 });
  });

  it('crops left/right, centered, when the image is relatively wider than the box', () => {
    // A landscape 4:3 photo (aspect ~1.333) into a portrait 2:3 box (aspect ~0.667).
    const uv = computeCoverUV(4 / 3, 2 / 3);
    expect(uv.repeatY).toBe(1);
    expect(uv.repeatX).toBeCloseTo((2 / 3) / (4 / 3), 5);
    // Centered horizontally -- the kept band sits symmetrically inside the full image.
    expect(uv.offsetX).toBeCloseTo((1 - uv.repeatX) / 2, 5);
    expect(uv.offsetY).toBe(0);
  });

  it('crops top/bottom, anchored to the image\'s own top, when the image is relatively taller than the box', () => {
    // A tall, narrow photo (aspect 0.5) into a squatter portrait card box (2/3 ~ 0.667) --
    // the photo is relatively TALLER than the box, so height is the axis that overflows.
    const uv = computeCoverUV(0.5, 2 / 3);
    expect(uv.repeatX).toBe(1);
    expect(uv.repeatY).toBeCloseTo(0.5 / (2 / 3), 5);
    expect(uv.offsetX).toBe(0);
    // object-position: top -- the kept band is anchored at the HIGH end of V (three's
    // default flipY puts the image's own top at V close to 1), not centered.
    expect(uv.offsetY).toBeCloseTo(1 - uv.repeatY, 5);
    expect(uv.offsetY).toBeGreaterThan(0);
  });

  it('fills the box exactly with no crop when the aspect ratios already match', () => {
    const uv = computeCoverUV(0.75, 0.75);
    expect(uv).toEqual({ repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0 });
  });
});
