import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three-stdlib';
import type { ShapePath } from 'three';

// TCORE-124: extrudes the project's existing 2D frame SVGs (grimoire-corner.svg /
// grimoire-medallion.svg) into 3D meshes instead of authoring separate .glb models --
// CoverFrame3DOverlay places one of these per corner/medallion slot of every visible card
// that resolves to a frame with corner3dUrl (see getCoverFrame3D). Parsed shapes are cached
// by URL at module scope (mirrors useGLTF's own URL cache in CatModel) since every card
// sharing the same frame id reuses the identical geometry.

const EXTRUDE_DEPTH = 6;
const BEVEL_SIZE = 0.6;

interface ParsedSvg {
  shapes: THREE.Shape[];
  // SVGLoader keeps the source's own pixel-space coordinates (not normalized to a 0..1 box)
  // -- CoverFrameMesh's `size` prop needs to know the actual extent of the parsed shapes to
  // scale them down to real on-screen pixels, matching CoverFrameCorners' own CORNER_SIZE/
  // MEDALLION_WIDTH/HEIGHT constants instead of hand-picking a magic scale per asset.
  width: number;
  height: number;
}

const svgCache = new Map<string, Promise<ParsedSvg>>();
const loader = new SVGLoader();

const loadSvgShapes = (url: string): Promise<ParsedSvg> => {
  let pending = svgCache.get(url);
  if (pending) return pending;
  pending = fetch(url)
    .then(res => res.text())
    .then(text => {
      const data = loader.parse(text);
      // three-stdlib's own SVGResultPaths widens ShapePath.userData to optional, which
      // three's real ShapePath (createShapes' declared param type) doesn't accept -- a
      // three-stdlib/three type mismatch between two files of the same library, not a real
      // shape mismatch (SVGLoader.parse's own paths ARE ShapePath instances at runtime).
      const shapes = data.paths.flatMap(path => SVGLoader.createShapes(path as unknown as ShapePath));
      // Recompute the bounding box across every shape actually extracted, rather than
      // trusting a viewBox string, since a couple of paths in these assets extend slightly
      // past their nominal viewBox (e.g. the medallion's -16..16 viewBox vs its widest path).
      const box = new THREE.Box2();
      shapes.forEach(shape => {
        shape.getPoints().forEach(p => box.expandByPoint(p));
      });
      const size = new THREE.Vector2();
      box.getSize(size);
      return { shapes, width: size.x || 1, height: size.y || 1 };
    });
  svgCache.set(url, pending);
  return pending;
};

// Suspense-friendly synchronous read of loadSvgShapes -- same throw-a-promise pattern
// react-three-fiber's own useLoader uses internally, kept local here since this is the only
// place in the codebase extruding an SVG (useGLTF/useLoader don't cover SVGLoader).
const resultCache = new Map<string, ParsedSvg>();
const useSvgShapes = (url: string): ParsedSvg => {
  const cached = resultCache.get(url);
  if (cached) return cached;
  throw loadSvgShapes(url).then(result => { resultCache.set(url, result); });
};

interface CoverFrameMeshProps {
  url: string;
  // Target size in scene units (== px, since CoverFrame3DOverlay's camera is orthographic
  // 1 unit == 1px) for the mesh's larger dimension -- mirrors CoverFrameCorners' own
  // CORNER_SIZE/MEDALLION_WIDTH constants so the 3D piece occupies the same footprint the
  // 2D image would have.
  size: number;
  color?: string;
  metalness?: number;
  roughness?: number;
}

// Bronze-plate look via three's own built-in meshStandardMaterial (metalness/roughness) --
// no third-party material library, and deliberately no <Environment>/envMap: a HIGH
// metalness value with no environment reflection to draw on renders close to black
// (confirmed the hard way in an earlier pass at this), and <Environment> pulls its HDRI
// from a remote CDN that a slow/offline session would silently never resolve. This stays
// moderate enough to read as bronze off CoverFrame3DOverlay's own plain directional/
// ambient lights alone.
export const CoverFrameMesh: React.FC<CoverFrameMeshProps> = ({ url, size, color = '#c9903f', metalness = 0.4, roughness = 0.45 }) => {
  const { shapes, width, height } = useSvgShapes(url);
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: EXTRUDE_DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL_SIZE,
      bevelSize: BEVEL_SIZE,
      bevelSegments: 2,
      curveSegments: 8,
    });
    geo.computeVertexNormals();
    geo.center();
    return geo;
  }, [shapes]);

  // Normalize by the larger source dimension, then apply `size` -- keeps aspect ratio (the
  // medallion is wider than tall, the corner is square) instead of stretching either one.
  // Y is flipped (SVG's own Y-down space vs. three's Y-up) and Z is left as-is.
  const scale = size / Math.max(width, height);

  return (
    <mesh geometry={geometry} scale={[scale, -scale, scale]}>
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
};
