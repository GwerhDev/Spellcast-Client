import { coverFrames, type CoverFrame } from '../config/assets';
import type { CSSProperties } from 'react';

// TCORE-123: the one place Spell.coverFrameId's three-state fallback (see that field's
// own comment in interfaces/index.ts) gets resolved, so every render site (SpellCard,
// SpellDetail, SpellDetailModal, EditorPickerCard) agrees on the same rule instead of
// re-deriving it -- undefined defers to the global default, null/a set id both win outright
// over it.
export const resolveCoverFrameId = (
  spellCoverFrameId: string | null | undefined,
  activeCoverFrameId: string | null,
): string | null =>
  spellCoverFrameId === undefined ? activeCoverFrameId : spellCoverFrameId;

export const getCoverFrameAsset = (id: string | null): CoverFrame | undefined =>
  id ? coverFrames.find(b => b.id === id) : undefined;

// Applied directly to whatever element already renders the cover <img> (or its
// placeholder) -- deliberately not a wrapper component, since every render site above
// already has its own cover sizing/object-fit CSS that a wrapper would have to either
// duplicate or fight with. A 'cornered' frame's straight edge banding is drawn here too
// (edgeColor, as a plain CSS border) -- only its corner plates render as a separate layer
// (see CoverFrameCorners), since a border is the one part of that design that DOES scale
// cleanly to any aspect ratio without distortion.
export const getCoverFrameStyle = (id: string | null): CSSProperties => {
  const asset = getCoverFrameAsset(id);
  if (!asset) return {};
  const border = asset.cornerImageUrl ? (asset.edgeColor ? `3px solid ${asset.edgeColor}` : undefined) : asset.cssValue;
  if (!border) return {};
  return {
    border,
    // "border" alone changes box size unless box-sizing is border-box -- every cover
    // element this is applied to is sized by explicit width/height or a CSS var, so this
    // keeps the frame from growing past that instead of requiring each call site to set
    // box-sizing itself.
    boxSizing: 'border-box',
    ...(asset.boxShadow ? { boxShadow: asset.boxShadow } : {}),
  };
};

export interface CoverFrameCornersConfig {
  cornerImageUrl: string;
  edgeColor?: string;
  medallionImageUrl?: string;
}

// The 'cornered' mechanism's own config for a resolved frame id, or null when this frame
// uses the plain CSS border mechanism instead (or there's no frame at all) -- render sites
// use this to decide whether to mount CoverFrameCorners alongside the cover <img>.
export const getCoverFrameCorners = (id: string | null): CoverFrameCornersConfig | null => {
  const asset = getCoverFrameAsset(id);
  if (!asset?.cornerImageUrl) return null;
  return {
    cornerImageUrl: asset.cornerImageUrl,
    edgeColor: asset.edgeColor,
    medallionImageUrl: asset.medallionImageUrl,
  };
};

export interface CoverFrame3DConfig {
  corner3dUrl: string;
  medallion3dUrl?: string;
}

// TCORE-124: the 3D-extrusion mechanism's own config for a resolved frame id, or null when
// this frame has no corner3dUrl (no 3D geometry source at all, or a frame that only defines
// the 2D mechanisms above). CoverFrame3DOverlay uses this per visible card to decide
// whether that card gets a 3D mesh instead of just leaving the 2D CoverFrameCorners in place.
export const getCoverFrame3D = (id: string | null): CoverFrame3DConfig | null => {
  const asset = getCoverFrameAsset(id);
  if (!asset?.corner3dUrl) return null;
  return {
    corner3dUrl: asset.corner3dUrl,
    medallion3dUrl: asset.medallion3dUrl,
  };
};
