import React, { Suspense } from 'react';
import { View, OrthographicCamera } from '@react-three/drei';
import { CoverFrameMesh } from './CoverFrameMesh';
import type { CoverFrame3DConfig } from '../../../utils/coverFrame';

// TCORE-124: one <View> per card, tracking that card's own real DOM element -- see
// CoverFrame3DRoot's own comment for why this replaced a single full-viewport canvas with
// manually-synced mesh positions (that had a visible lag behind the real DOM, and needed
// position: fixed + an invented z-index that could paint over real page chrome like the
// sidebar). <View> reads its tracked element's rect from inside r3f's own render loop
// (same pass that paints, not a parallel requestAnimationFrame) and scissor-draws only that
// screen rectangle -- so this literally cannot lag behind the DOM the way the old design
// could, and the tracked element itself is a normal in-flow <div>, so it inherits the
// correct stacking context automatically instead of needing a manual z-index guess.

const CORNER_SIZE = 28; // matches CoverFrameCorners' own CORNER_SIZE
const CORNER_OVERHANG = 2;
// CoverFrameCorners' medallion is 22x18 (MEDALLION_WIDTH/HEIGHT there) -- only the larger
// dimension is needed here since CoverFrameMesh's own `size` prop scales by the source
// SVG's larger dimension and preserves its aspect ratio automatically.
const MEDALLION_WIDTH = 22;
// grimoire-medallion.svg's own gem circle (r="4") as a fraction of the SVG's larger
// dimension (viewBox 32x26, so 32) -- CoverFrameMesh's gem prop scales by this ratio so the
// glass gem sphere lands at the same relative size/position the flat SVG circle occupies,
// without hand-picking a pixel radius per render size.
const GEM_RADIUS_RATIO = 4 / 32;
const GEM_COLOR = '#4fc3d9'; // matches grimoire-medallion.svg's own #gem gradient midtone

interface CoverFrame3DViewProps {
  config: CoverFrame3DConfig;
  // Real px size of the card's own cover box (SpellCard's .coverWrapper) -- passed in
  // rather than measured internally, since the caller (CoverFrameSlot3D) already needs this
  // element's ref for the tracked <div> itself and CSS already sizes it to match the 2D
  // cover exactly (see that component).
  width: number;
  height: number;
}

// The 4 corners + medallion, positioned relative to a card of the given size -- pure
// geometry/layout, no DOM sync of its own (that's what <View track> above it handles).
const CornerLayout: React.FC<CoverFrame3DViewProps> = ({ config, width, height }) => {
  const { corner3dUrl, medallion3dUrl } = config;
  const halfW = width / 2;
  const halfH = height / 2;

  return (
    <>
      {/* Mirroring via a negated scale axis, matching CoverFrameCorners' own CSS transform:
          scaleX(-1)/scaleY(-1)/scale(-1,-1) exactly (see that component's comment) --
          CoverFrameMesh's own material uses side: THREE.DoubleSide specifically so this is
          safe: a negated axis flips triangle winding, which would otherwise flip which face
          THREE.FrontSide (the default) considers "front" for exactly the corners with an
          ODD number of negated axes. DoubleSide sidesteps that. */}
      <group position={[halfW - CORNER_SIZE / 2 + CORNER_OVERHANG, halfH - CORNER_SIZE / 2 + CORNER_OVERHANG, 0]} rotation={[0, Math.PI, 0]}>
        <CoverFrameMesh url={corner3dUrl} size={CORNER_SIZE} />
      </group>
      <group position={[-(halfW - CORNER_SIZE / 2 + CORNER_OVERHANG), halfH - CORNER_SIZE / 2 + CORNER_OVERHANG, 0]} scale={[-1, 1, 1]} rotation={[0, Math.PI, 0]}>
        <CoverFrameMesh url={corner3dUrl} size={CORNER_SIZE} />
      </group>
      <group position={[halfW - CORNER_SIZE / 2 + CORNER_OVERHANG, -(halfH - CORNER_SIZE / 2 + CORNER_OVERHANG), 0]} scale={[1, -1, 1]} rotation={[0, Math.PI, 0]}>
        <CoverFrameMesh url={corner3dUrl} size={CORNER_SIZE} />
      </group>
      <group position={[-(halfW - CORNER_SIZE / 2 + CORNER_OVERHANG), -(halfH - CORNER_SIZE / 2 + CORNER_OVERHANG), 0]} scale={[-1, -1, 1]} rotation={[0, Math.PI, 0]}>
        <CoverFrameMesh url={corner3dUrl} size={CORNER_SIZE} />
      </group>
      {medallion3dUrl && (
        <>
          <group position={[0, halfH, 0]}>
            <CoverFrameMesh url={medallion3dUrl} size={MEDALLION_WIDTH} gem={{ radiusRatio: GEM_RADIUS_RATIO, color: GEM_COLOR }} />
          </group>
          <group position={[0, -halfH, 0]} scale={[1, -1, 1]}>
            <CoverFrameMesh url={medallion3dUrl} size={MEDALLION_WIDTH} gem={{ radiusRatio: GEM_RADIUS_RATIO, color: GEM_COLOR }} />
          </group>
        </>
      )}
    </>
  );
};

// The actual <View> content -- separate from CoverFrameSlot3D (the DOM wrapper) so the
// orthographic camera (1 scene unit == 1 CSS px, matching this card's own size) and the
// Suspense boundary for the SVG-extrusion geometry (see CoverFrameMesh) live inside the
// tracked view's own render tree, not the wrapper.
export const CoverFrame3DView: React.FC<CoverFrame3DViewProps & { trackRef: React.RefObject<HTMLDivElement | null> }> = ({ config, width, height, trackRef }) => (
  <View track={trackRef as React.RefObject<HTMLElement>}>
    <OrthographicCamera makeDefault position={[0, 0, 100]} near={0.1} far={1000} zoom={1} />
    <Suspense fallback={null}>
      <CornerLayout config={config} width={width} height={height} />
    </Suspense>
  </View>
);
