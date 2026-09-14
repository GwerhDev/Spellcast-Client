import * as THREE from 'three';

// TCORE-124 follow-up: the cover-photo plane (CoverTexturePlane) lives in the SAME
// unclipped <View> as the frame ornaments (see CoverFrame3DView's own comment on why --
// the ornaments' overhang needs room a CSS overflow:hidden box can't give them), so it
// can't rely on a clipped DOM ancestor to round its own corners the way the plain 2D
// `<img>` did (`border-radius` on a CSS box that also has `overflow: hidden`). A plain
// `THREE.PlaneGeometry` would render hard square corners poking past the card's own
// rounded shell. This builds a rounded-rectangle `THREE.Shape` instead, centered at the
// origin, matching the box's own `width`/`height` in the same scene units (== px) every
// other TCORE-124 mesh uses -- CoverTexturePlane extrudes/fills it flat.
export const roundedRectShape = (width: number, height: number, radius: number): THREE.Shape => {
  const w = width / 2;
  const h = height / 2;
  // Clamp so a radius bigger than half the box (shouldn't happen with the actual card
  // radii in use, but a bad prop value would otherwise self-intersect the curves below)
  // never produces a degenerate shape.
  const r = Math.min(radius, w, h);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
};
