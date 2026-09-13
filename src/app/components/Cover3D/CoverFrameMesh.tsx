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
  // TCORE-124 polish pass: the medallion's own gem circle (grimoire-medallion.svg's `r="4"`
  // circle, centered at the SVG's own origin) reads as flat bronze once extruded with the
  // rest of the plate -- a gem needs a different material entirely (glassy, not metallic).
  // Rather than split the SVG into two separately-extruded shape groups (fragile: depends on
  // knowing which path index is "the gem" per asset), a small sphere is layered on top at
  // the same spot, in scene units derived from the same `size`/gemRadius the 2D SVG uses.
  // Undefined (the corner plates) skips this entirely.
  gem?: { radiusRatio: number; color: string };
}

// Bronze-plate look via three's own built-in meshStandardMaterial (metalness/roughness) --
// no third-party material library, and deliberately no <Environment>/envMap: a HIGH
// metalness value with no environment reflection to draw on renders close to black
// (confirmed the hard way in an earlier pass at this), and <Environment> pulls its HDRI
// from a remote CDN that a slow/offline session would silently never resolve. This stays
// moderate enough to read as bronze off CoverFrame3DOverlay's own plain directional/
// ambient lights alone.
export const CoverFrameMesh: React.FC<CoverFrameMeshProps> = ({ url, size, color = '#c9903f', metalness = 0.4, roughness = 0.45, gem }) => {
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
  const gemRadius = gem ? size * gem.radiusRatio : 0;

  return (
    <>
      <mesh geometry={geometry} scale={[scale, -scale, scale]}>
        {/* side: DoubleSide -- CoverFrame3DOverlay mirrors this mesh into corners via a
            negated scale axis on the parent group. An odd number of negated axes flips the
            triangle winding, which flips which face THREE.FrontSide (the default) considers
            "front" -- so with FrontSide, some mirrored corners would render face-culled
            (looking hollow/inside-out) while others looked fine. DoubleSide renders both
            faces regardless of winding, so every corner reads correctly. */}
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} />
      </mesh>
      {gem && (
        // Sits just in front of the plate (a few Z units toward the camera, in the plate's
        // OWN local space before the parent group's mirroring/scale is applied) so it never
        // z-fights with the flat bronze disc already extruded from the SVG's gem circle --
        // that disc stays as the gem's bronze bezel/socket, this sphere is the stone sitting
        // in it. A low-poly icosahedron (not a UV sphere) facets the surface slightly, which
        // reads as a cut/polished gem rather than a perfectly smooth glass marble at this
        // small a size.
        <mesh position={[0, 0, EXTRUDE_DEPTH / 2 + gemRadius * 0.5]}>
          <icosahedronGeometry args={[gemRadius, 1]} />
          {/* No transmission/refraction material (MeshTransmissionMaterial) -- that samples
              a render-to-texture buffer per instance, expensive for a ~5px gem repeated per
              card, and there's nothing meaningful behind a transparent canvas to refract
              anyway. meshPhysicalMaterial with metalness 0 + low roughness + a clearcoat
              layer + a touch of emissive reads as a polished, glassy stone off plain local
              lights alone -- no envMap/HDRI dependency, same reasoning as the bronze above. */}
          <meshPhysicalMaterial
            color={gem.color}
            metalness={0}
            roughness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.1}
            emissive={gem.color}
            emissiveIntensity={0.35}
            transparent
            opacity={0.92}
          />
        </mesh>
      )}
    </>
  );
};
