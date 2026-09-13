export type AssetCategory = 'sound-background' | 'page-background' | 'companion' | 'cover-frame';
export type UnlockMethod = 'free' | 'purchase' | 'achievement';

interface BaseAsset {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  unlockMethod: UnlockMethod;
  price?: number;
  achievementId?: string;
  tags: string[];
}

export interface SoundBackground extends BaseAsset {
  category: 'sound-background';
  streamUrl: string;
  loop: boolean;
  available?: boolean;
}

export interface PageBackground extends BaseAsset {
  category: 'page-background';
  cssValue: string | null;
  thumbnail: string;
  textColor?: string;
  highlightColor?: string;
  sentenceHoverColor?: string;
}

export interface CompanionModel {
  id: string;
  color: string;
  // No real .glb exists yet — models render as simple colored geometry (see CatModel).
  // Kept here so a future model file can be wired in without touching the catalog shape.
  modelUrl?: string;
}

// TCORE-123: frames the spell cover wherever it's shown (SpellCard, SpellDetail,
// SpellDetailModal, EditorPickerCard) -- deliberately NOT on the audio/browser players'
// own small cover thumbnail, where it doesn't fit that compact a UI element. Three
// rendering mechanisms -- see getCoverFrameStyle/
// getCoverFrameCorners in utils/coverFrame.ts for how each is applied, and
// CoverFrameCorners.tsx for the 'cornered' mechanism's own component:
//   - cssValue (+ optional boxShadow): a plain `border` shorthand around the cover image
//     itself, for a slim/simple frame. boxShadow is an additive ring/glow layered on top,
//     kept as a plain CSS value rather than derived from the border color since a few
//     borders are gradients that don't reduce to one color to glow with.
//   - cornerImageUrl (+ edgeColor, optional medallionImageUrl): a "9-slice"-style frame --
//     the SAME fixed-size corner image is placed in each of the cover's 4 corners (CSS
//     rotation/mirroring for the other 3, never re-scaled), edgeColor draws the straight
//     banding between them as a plain CSS border, and medallionImageUrl (if given) centers
//     a small clasp/gem on the top and bottom edges. This exists because a single frame
//     image sized to the cover's own box (the mechanism this replaced) gets stretched by
//     object-fit to whatever aspect ratio each render site's cover box actually is --
//     SpellCard's is ~0.89:1, SpellDetail's ~0.73:1 -- and 'cover' crops the corner plates
//     while 'contain' shrinks the whole frame into a smaller box with empty margins,
//     neither of which is right. Corner
//     images at a fixed pixel size in each real corner are the only mechanism that stays
//     crisp and uncropped regardless of the box's own aspect ratio.
//   - 3D frames (a real WebGL model wrapping the cover): CompanionOverlay's per-model
//     <canvas> approach (one live WebGL context per instance) was evaluated and rejected
//     for THIS use as the rendering mechanism, since browsers cap simultaneous WebGL
//     contexts (commonly 8-16) and Last Spells/Grimoire routinely render 20-50+ SpellCards
//     at once -- one context per card would exceed that limit immediately. TCORE-124
//     instead renders 3D corners in a single shared <Canvas> overlaid on the section,
//     positioned per-card from each card's own DOM rect (see CoverFrame3DOverlay) -- so
//     corner3dUrl/medallion3dUrl below are optional geometry sources for THAT single
//     canvas, not a per-card context. SpellCard itself stays 2D/untouched; cssValue/
//     cornerImageUrl above remain the fallback whenever the 3D overlay isn't mounted
//     (mobile, reduced-motion, low-end, or the user's own Mode3D setting off -- see
//     useCoverFrame3DGate).
export interface CoverFrame extends BaseAsset {
  category: 'cover-frame';
  cssValue?: string;
  boxShadow?: string;
  cornerImageUrl?: string;
  edgeColor?: string;
  medallionImageUrl?: string;
  thumbnail: string;
  // TCORE-124: SVG source extruded into a 3D corner-plate mesh by CoverFrameMesh, reusing
  // cornerImageUrl's own artwork rather than authoring a separate model. Optional -- a
  // frame with cornerImageUrl but no corner3dUrl still gets the 2D corners, just never the
  // 3D ones.
  corner3dUrl?: string;
  // Same idea for the medallion piece; independent of corner3dUrl so a frame could in
  // principle 3D-extrude one but not the other.
  medallion3dUrl?: string;
}

export interface Companion extends BaseAsset {
  category: 'companion';
  models: CompanionModel[];
  thumbnail: string;
  scale?: number;
  speed?: number;
  // Shown as visible-but-locked ("Soon") ahead of its public release (see companions.ts),
  // instead of following its normal unlockMethod — set per environment, not hand-authored.
  comingSoon?: boolean;
  // Excludes this companion from FREE_IDS' auto-unlock (casterInventorySlice.ts), even though
  // unlockMethod is 'free' — without this, the moment comingSoon flips false, EVERY fresh
  // session (no persisted unlockedIds yet) silently starts with it already unlocked via
  // FREE_IDS, which then blocks the gift-announcement modal's own `!isUnlocked` check
  // before it ever gets a chance to show. Set on companions meant to be handed out through
  // an explicit unlock flow (a gift modal, an in-app claim) rather than silently defaulted.
  requiresExplicitUnlock?: boolean;
}

export type Asset = SoundBackground | PageBackground | Companion | CoverFrame;
