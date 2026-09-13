// TCORE-124: plain numeric constants shared between CoverFrame3DView (the lazy-loaded
// three.js/drei tree) and SpellCard (which must NOT statically import anything from that
// tree, or the ~900kB three.js bundle stops being lazy -- see SpellCard's own comment on
// why CoverFrame3DView is React.lazy()'d there). Kept in this file, with zero imports of
// its own, specifically so SpellCard can import just these numbers without pulling in
// three/@react-three/fiber/@react-three/drei alongside them.

export const CORNER_SIZE = 28; // matches CoverFrameCorners' own CORNER_SIZE
export const CORNER_OVERHANG = 2; // matches CoverFrameCorners' own CORNER_OVERHANG

// Matches CoverFrameCorners' own MEDALLION_HEIGHT exactly (that component centers its
// medallion <img> ON the cover's own top/bottom edge via `top:0`/`bottom:0` +
// translate(...,-50%/50%) -- so half of MEDALLION_HEIGHT, 9px, is how far it overhangs past
// the edge). CoverFrame3DView.tsx anchors its medallion mesh the same way (position centered
// AT halfH), so it needs that same 9px of headroom vertically.
const MEDALLION_HEIGHT = 18;

// .coverFrameSlot's own margin (see that CSS rule's comment) is NOT one uniform number on
// every side -- top/bottom need enough room for the MEDALLION's overhang (9px, far bigger
// than the corners'), but left/right only ever hold corner plates (2px). A single shared
// VIEW_MARGIN applied to all four sides (the bug this replaces) fixed the medallion's
// top/bottom clipping but then over-inset the corners left/right by the same 9px, reading as
// unwanted padding around them instead of them sitting flush at the cover's edge. Two
// separate CSS vars (--cover-frame-3d-margin-x/-y, set by SpellCard from these two
// constants) let .coverFrameSlot's box grow by exactly the amount each axis needs, no more.
export const VIEW_MARGIN_X = CORNER_OVERHANG;
export const VIEW_MARGIN_Y = Math.max(CORNER_OVERHANG, MEDALLION_HEIGHT / 2);
