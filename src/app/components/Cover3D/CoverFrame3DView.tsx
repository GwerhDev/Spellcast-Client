import React, { Suspense, useEffect, useState } from 'react';
import { View, OrthographicCamera } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { CoverFrameMesh } from './CoverFrameMesh';
import { CORNER_SIZE, CORNER_OVERHANG, VIEW_MARGIN_X, VIEW_MARGIN_Y } from './constants';
import type { CoverFrame3DConfig } from '../../../utils/coverFrame';

// TCORE-124: one <View> per card, integrated directly in that card's own DOM position --
// see CoverFrame3DRoot's own comment for why this replaced a single full-viewport canvas
// with manually-synced mesh positions (that had a visible lag behind the real DOM, and
// needed position: fixed + an invented z-index that could paint over real page chrome like
// the sidebar).
//
// Correction (found by reading drei's own View.js source after the first version of this
// rendered nothing): drei's <View>, used OUTSIDE a <Canvas> (this is always the case here --
// SpellCard's own tree has no <Canvas> ancestor), IS the tracked DOM element itself --
// passing a `track` prop pointing at a SEPARATE, externally-created <div> does NOT work,
// because HtmlView (the internal component View renders in this "standalone" mode) ignores
// its own `track` prop entirely and creates ITS OWN internal <div>, using THAT as the
// tracked element instead. The earlier version of this file wrapped <View track={...}> in a
// separate outer <div ref={trackRef}> measured via ResizeObserver -- that outer div was
// pure dead weight; <View>'s own internal div (invisible to the caller, but the one that
// actually matters) was tracking a size of 0 the whole time. <View> now IS the positioned
// element -- give it className/style directly, same as any other DOM element in this slot.
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
  className?: string;
}

// The 4 corners + medallion, positioned relative to the COVER's own box (not this view's
// own, larger, tracked element -- see CoverFrame3DView's own comment on the inset margin).
// coverHalfW/H are the .coverFrameSlot box's own half-size, derived by subtracting the
// margin back out of the view's real tracked size (read via drei's useThree(({ size }) =>
// size), which View keeps in sync with its internal div's real getBoundingClientRect()
// every frame). Pure geometry/layout, no DOM sync of its own.
const CornerLayout: React.FC<{ config: CoverFrame3DConfig; marginX: number; marginY: number }> = ({ config, marginX, marginY }) => {
  const { corner3dUrl, medallion3dUrl } = config;
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // useThree's `size` is the VIEW's own tracked-element size (View sets up a nested R3F
  // context scoped to itself), not the shared root canvas' size -- exactly what's needed
  // here, and specifically why this reads it via a hook inside the View's own children
  // rather than being passed down as a prop from outside (CoverFrameSlot3D-style
  // measurement was the broken approach this replaces).
  useThreeSize(setSize);

  if (!size || size.width === 0 || size.height === 0) return null;
  // marginX/marginY subtract back out .coverFrameSlot's OWN per-axis margin (see that CSS
  // rule's comment on why X and Y need different amounts) -- NOT one shared margin, or the
  // corners (which only ever need marginX's small amount) would get pushed inward by
  // whatever larger amount the medallion needs vertically. See constants.ts' own
  // VIEW_MARGIN_X/VIEW_MARGIN_Y comment.
  const halfW = size.width / 2 - marginX;
  const halfH = size.height / 2 - marginY;

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

// Small indirection so CornerLayout's own read doesn't repeat the useThree(s => s.size)
// destructure inline -- this only ever works inside a View's own render tree, since that's
// what scopes useThree's returned `size` to the tracked element's own rect rather than the
// shared root canvas' size.
function useThreeSize(setSize: (s: { width: number; height: number }) => void) {
  const size = useThree(s => s.size);
  useEffect(() => { setSize({ width: size.width, height: size.height }); }, [size.width, size.height, setSize]);
}

// Rendered by SpellCard in place of CoverFrameCorners when 3D is active for this card (see
// SpellCard's own `show3D` prop) -- same position in the DOM tree as the old .coverFrameSlot
// (a sibling of .cardClip, so it can overhang the card's own rounded corners).
//
// VIEW_MARGIN_X/VIEW_MARGIN_Y (see constants.ts): <View>'s tracked element IS the WebGL
// scissor rect (see this file's top comment): three.js clips everything to that element's
// own screen rectangle, with no concept of "overflow" the way CSS does. CoverFrameCorners'
// 2D mechanism deliberately overhangs each piece past the cover's own edge (a picture-frame
// "bolted-on plate" look, see that component's own comment) by relying on .coverFrameSlot
// never clipping overflow -- but a 3D scissor rect sized exactly to the cover box would
// hard-clip that same overhang at the box's edge instead.
//
// This margin has to be built into .coverFrameSlot's OWN box (via its
// --cover-frame-3d-margin-x/-y CSS vars, set by SpellCard), not just into this <View>'s own
// inset -- .coverFrameSlot sits at the exact same vertical position as .cardClip (which
// DOES clip overflow, covering the whole card, not just the cover), so any part of a
// naively self-enlarged <View> extending past .coverFrameSlot's own box -- even while still
// fully inside .card -- got cut off by .cardClip regardless of how this component sized
// itself. Growing .coverFrameSlot's own box first, then letting <View> fill 100% of that
// already-enlarged box (inset: 0 below), keeps the whole margin genuinely outside anything
// that clips. The corners/medallion are positioned relative to the ORIGINAL (un-enlarged)
// cover size, computed back out of the tracked size inside CornerLayout via the
// `marginX`/`marginY` props -- two separate axes, not one shared number, because the
// medallion's own overhang is far bigger vertically than any piece ever is horizontally (see
// constants.ts' own comment on why a single shared margin over-inset the corners).
//
// Lights are declared HERE, inside each View's own children, not once in CoverFrame3DRoot --
// confirmed by reading View.js: CanvasView portals its children into its OWN
// `virtualScene` (a separate THREE.Scene per tracked view), so lights placed directly in
// the shared root canvas (CoverFrame3DRoot) illuminate only ITS OWN top-level scene, never
// the per-view virtual scenes -- every corner rendered pitch black until this was added
// here instead.
export const CoverFrame3DView: React.FC<CoverFrame3DViewProps> = ({ config, className }) => (
  <View className={className} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <OrthographicCamera makeDefault position={[0, 0, 100]} near={0.1} far={1000} zoom={1} />
    <ambientLight intensity={1.1} />
    <directionalLight position={[40, 60, 80]} intensity={1.6} />
    <directionalLight position={[-30, -20, 60]} intensity={0.5} />
    <directionalLight position={[0, -40, 30]} intensity={0.4} color="#dff2ff" />
    <Suspense fallback={null}>
      <CornerLayout config={config} marginX={VIEW_MARGIN_X} marginY={VIEW_MARGIN_Y} />
    </Suspense>
  </View>
);
