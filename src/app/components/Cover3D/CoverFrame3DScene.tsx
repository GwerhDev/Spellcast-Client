import React, { Suspense } from 'react';
import * as THREE from 'three';
import { OrthographicCamera } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { CoverFrameMesh } from './CoverFrameMesh';
import { CoverTexturePlane } from './CoverTexturePlane';
import { CORNER_SIZE, CORNER_OVERHANG, VIEW_MARGIN_X, VIEW_MARGIN_Y } from './constants';
import type { CoverFrame3DConfig } from '../../../utils/coverFrame';

// The 3D cover object and what's built on it: the cover with its frame (CoverObjectLayout),
// a book of it (Book3D), and a scene drawing one cover in a canvas of its own
// (CoverFrame3DScene, see CoverFrame3DCanvas).

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

// The cover photo + 4 corners + medallion, centered on the origin, 1 unit = 1 px. `size` is
// the box they're laid out in -- the cover's box with marginX/marginY of room around it for
// the pieces' overhang (see constants.ts' VIEW_MARGIN_X/Y). Pure geometry/layout.
export const CoverObjectLayout: React.FC<{ config: CoverFrame3DConfig; coverUrl: string; radius: number; marginX: number; marginY: number; size: { width: number; height: number } }> = ({ config, coverUrl, radius, marginX, marginY, size }) => {
  const { corner3dUrl, medallion3dUrl } = config;

  if (size.width === 0 || size.height === 0) return null;
  // marginX/marginY subtract back out .coverFrameSlot's OWN per-axis margin (see that CSS
  // rule's comment on why X and Y need different amounts) -- NOT one shared margin, or the
  // corners (which only ever need marginX's small amount) would get pushed inward by
  // whatever larger amount the medallion needs vertically. See constants.ts' own
  // VIEW_MARGIN_X/VIEW_MARGIN_Y comment.
  const halfW = size.width / 2 - marginX;
  const halfH = size.height / 2 - marginY;

  return (
    <>
      {/* The backdrop -- pushed back in Z (away from the camera) so it can never z-fight
          with the corner/medallion plates' own extruded volume, which spans roughly
          +/-EXTRUDE_DEPTH/2 around each of their own group's local origin (see
          CoverFrameMesh). Sized to the ORIGINAL unmargined cover box (2*halfW x 2*halfH),
          matching exactly what the plain 2D `<img>` this replaces used to fill. */}
      <group position={[0, 0, -4]}>
        <CoverTexturePlane url={coverUrl} width={halfW * 2} height={halfH * 2} radius={radius} />
      </group>
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

// A book: its cover (with its frame, in 3D, when it has one) on the front of a block of
// pages, the cover centered on the origin, `width` x `height` px.
export const BOOK_DEPTH = 22;
export const Book3D: React.FC<{ coverUrl: string | null; frame3D: CoverFrame3DConfig | null; width: number; height: number; radius?: number }> = ({ coverUrl, frame3D, width, height, radius = 3.2 }) => (
  <>
    {coverUrl && frame3D ? (
      <Suspense fallback={null}>
        <CoverObjectLayout
          config={frame3D}
          coverUrl={coverUrl}
          radius={radius}
          marginX={VIEW_MARGIN_X}
          marginY={VIEW_MARGIN_Y}
          size={{ width: width + 2 * VIEW_MARGIN_X, height: height + 2 * VIEW_MARGIN_Y }}
        />
      </Suspense>
    ) : coverUrl ? (
      <group position={[0, 0, -4]}>
        <CoverTexturePlane url={coverUrl} width={width} height={height} radius={radius} />
      </group>
    ) : (
      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#2c2f36" />
      </mesh>
    )}
    {/* The pages, behind the cover. */}
    <mesh position={[0, 0, -4.5 - BOOK_DEPTH / 2]}>
      <boxGeometry args={[width - 4, height - 4, BOOK_DEPTH]} />
      <meshStandardMaterial color="#d9cfb8" roughness={0.9} />
    </mesh>
  </>
);

// What an element on the page looks like right now, which its box alone doesn't say: turned,
// scaled or faded -- by itself or by what holds it (the Grimoire deals its cards in turning,
// growing and fading in). The 2D part of its transform (turn, scale, skew) and its opacity,
// all of its ancestors' included -- none at all where it's hidden (e.g. a card's cover
// lifted into its open detail).
export const readLook = (el: HTMLElement) => {
  let matrix = new DOMMatrix();
  let opacity = getComputedStyle(el).visibility === 'hidden' ? 0 : 1;
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.transform && style.transform !== 'none') matrix = new DOMMatrix(style.transform).multiply(matrix);
    opacity *= parseFloat(style.opacity) || 0;
  }
  return { matrix, opacity };
};

// Brightness and opacity on every material of an object, from what each one was made with.
export const tint = (object3D: THREE.Object3D, light: number, opacity: number) => {
  object3D.traverse(object => {
    const material = (object as THREE.Mesh).material as (THREE.Material & { color?: THREE.Color }) | undefined;
    if (!material || Array.isArray(material)) return;
    if (material.userData.baseColor === undefined && material.color) material.userData.baseColor = material.color.clone();
    material.userData.baseOpacity ??= material.opacity;
    if (material.color && material.userData.baseColor) material.color.copy(material.userData.baseColor).multiplyScalar(light);
    material.transparent = material.transparent || opacity < 1;
    material.opacity = material.userData.baseOpacity * opacity;
  });
};

// One cover in a canvas of its own (see CoverFrame3DCanvas), with its camera and lights,
// sized to the canvas -- whose box has the VIEW_MARGIN_X/Y room around the cover built in.
const SizedLayout: React.FC<{ config: CoverFrame3DConfig; coverUrl: string; radius: number }> = ({ config, coverUrl, radius }) => {
  const size = useThree(st => st.size);
  return <CoverObjectLayout config={config} coverUrl={coverUrl} radius={radius} marginX={VIEW_MARGIN_X} marginY={VIEW_MARGIN_Y} size={size} />;
};

export const CoverFrame3DScene: React.FC<{ config: CoverFrame3DConfig; coverUrl: string; radius: number }> = ({ config, coverUrl, radius }) => (
  <>
    <OrthographicCamera makeDefault position={[0, 0, 100]} near={0.1} far={1000} zoom={1} />
    <ambientLight intensity={1.1} />
    <directionalLight position={[40, 60, 80]} intensity={1.6} />
    <directionalLight position={[-30, -20, 60]} intensity={0.5} />
    <directionalLight position={[0, -40, 30]} intensity={0.4} color="#dff2ff" />
    <Suspense fallback={null}>
      <SizedLayout config={config} coverUrl={coverUrl} radius={radius} />
    </Suspense>
  </>
);
