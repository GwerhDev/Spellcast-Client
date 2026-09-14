// Replicates CSS `object-fit: cover; object-position: top` (what the plain `<img>`
// CoverTexturePlane replaces used, via getCoverFrameStyle's sibling styling) as a
// THREE.Texture repeat/offset pair -- crops whichever axis is relatively longer than the
// box, centered horizontally, anchored to the TOP vertically (object-position: top's own
// default horizontal centering + explicit top anchor), never stretched. Pure function, no
// THREE dependency of its own beyond the shape of the numbers -- its own file (mirroring
// roundedRectShape.ts' own precedent in this directory) so it's unit-testable without a
// texture/WebGL context, and so CoverTexturePlane.tsx keeps exporting only its component
// (react-refresh/only-export-components).
export const computeCoverUV = (imageAspect: number, boxAspect: number): { repeatX: number; repeatY: number; offsetX: number; offsetY: number } => {
  if (imageAspect > boxAspect) {
    // Image is relatively wider than the box -- fit height, crop left/right, centered.
    const repeatX = boxAspect / imageAspect;
    return { repeatX, repeatY: 1, offsetX: (1 - repeatX) / 2, offsetY: 0 };
  }
  // Image is relatively taller than the box -- fit width, crop top/bottom. Texture V0 is
  // the bottom of the source image (three's default flipY), so anchoring the CROP at the
  // image's own top means the kept band sits at the HIGH end of V.
  const repeatY = imageAspect / boxAspect;
  return { repeatX: 1, repeatY, offsetX: 0, offsetY: 1 - repeatY };
};
