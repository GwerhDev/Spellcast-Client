import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { roundedRectShape } from './roundedRectShape';
import { computeCoverUV } from './computeCoverUV';

// TCORE-124 follow-up: the cover photo itself, as a textured mesh in the SAME local 3D
// space as the frame ornaments (CoverFrameMesh) -- previously the photo stayed a plain 2D
// `<img>` while only the ornaments were 3D, two independently-laid-out things the caller
// had to keep lined up by hand. One `<group>` (see CoverFrame3DView) now owns both, so
// there's nothing left to keep in sync.

// Each card's `coverUrl` is a UNIQUE per-spell blob URL (unlike the handful of shared
// frame SVGs CoverFrameMesh caches for the process lifetime) -- a texture built from one
// must NOT be cached forever or every scroll/remount leaks a full-resolution GPU texture.
// This module-scope map only holds each texture's IN-FLIGHT load promise long enough for
// Suspense to resolve it; `CoverTexturePlane` itself owns disposal via its own effect
// cleanup below, keyed to this exact component instance's `url`.
const pendingLoads = new Map<string, Promise<THREE.Texture>>();
const loader = new THREE.TextureLoader();

const loadTexture = (url: string): Promise<THREE.Texture> => {
  let pending = pendingLoads.get(url);
  if (pending) return pending;
  pending = loader.loadAsync(url).then(texture => {
    // Modern three (this project's ^0.185) expects colorSpace set explicitly on a texture
    // used as a color map -- without it a photo renders visibly washed out/too bright,
    // since the loader defaults to a linear (non-color) interpretation otherwise.
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
  pendingLoads.set(url, pending);
  return pending;
};

const resultCache = new Map<string, THREE.Texture>();

// Same throw-a-promise Suspense pattern as CoverFrameMesh's own `useSvgShapes` -- kept
// local here (rather than pulling in drei's `useTexture`) so this file's loading/caching
// semantics stay obviously different from the frame SVGs' forever-cached ones, instead of
// looking identical while secretly behaving differently.
const useTextureSuspense = (url: string): THREE.Texture => {
  const cached = resultCache.get(url);
  if (cached) return cached;
  throw loadTexture(url).then(result => { resultCache.set(url, result); });
};

interface CoverTexturePlaneProps {
  url: string;
  // Box size in scene units (== px, this View's orthographic camera is 1 unit == 1px) --
  // the box the CSS `<img>` used to fill, i.e. the cover's own unmargined size (NOT the
  // enlarged VIEW_MARGIN box the ornaments need room to overhang into).
  width: number;
  height: number;
  // Matches the card's own `.card`/`.cardClip` border-radius in that call site's CSS
  // module -- see each call site's own comment for the exact value.
  radius: number;
}

const CoverTexturePlaneInner: React.FC<CoverTexturePlaneProps> = ({ url, width, height, radius }) => {
  const texture = useTextureSuspense(url);

  useEffect(() => {
    const image = texture.image as { width?: number; height?: number } | undefined;
    const naturalW = image?.width ?? width;
    const naturalH = image?.height ?? height;
    const { repeatX, repeatY, offsetX, offsetY } = computeCoverUV(naturalW / naturalH, width / height);
    texture.repeat.set(repeatX, repeatY);
    texture.offset.set(offsetX, offsetY);
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
  }, [texture, width, height]);

  // Each card's own texture is disposed when ITS url changes or it unmounts (long
  // Grimoire lists scroll cards in and out constantly) -- also drop it from resultCache
  // and pendingLoads so neither map grows without bound over a session with many
  // different spells scrolled through (unlike CoverFrameMesh's svgCache, which is safe to
  // keep forever because the handful of frame assets it holds never changes). Doesn't
  // touch either map for any OTHER url still in flight or in use.
  useEffect(() => () => {
    resultCache.delete(url);
    pendingLoads.delete(url);
    texture.dispose();
  }, [url, texture]);

  const geometry = useMemo(() => {
    const shape = roundedRectShape(width, height, radius);
    const geo = new THREE.ShapeGeometry(shape);
    // THREE.ShapeGeometry's own generated UVs aren't guaranteed 0..1 for a shape not
    // centered on a unit box -- remap explicitly from the shape's own known -w..w/-h..h
    // extent so the crop math above (which assumes a plain 0..1 UV range) is exact
    // rather than incidentally close.
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / width + 0.5, pos.getY(i) / height + 0.5);
    }
    uv.needsUpdate = true;
    return geo;
  }, [width, height, radius]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
};

// Suspense boundary of its own -- a slow/large cover photo shouldn't block the frame
// ornaments (CoverFrameMesh, its own separately-cached, typically-already-warm SVG
// shapes) from appearing; each waits on its own asset independently.
export const CoverTexturePlane: React.FC<CoverTexturePlaneProps> = (props) => (
  <React.Suspense fallback={null}>
    <CoverTexturePlaneInner {...props} />
  </React.Suspense>
);
