import { useCoverFrame3DGate } from './useCoverFrame3DGate';

// TCORE-124: thin wrapper around useCoverFrame3DGate -- kept as its own hook (not just
// calling useCoverFrame3DGate directly from LastSpells/SpellList) so a caller's intent
// reads clearly ("gate my whole 3D-corners section") and so this is the one place a future
// per-section concern (if one ever comes up) gets added, without every call site having to
// change.
//
// This got dramatically simpler than its first version: that one also built per-card
// "anchor" objects and a <style> tag hiding each card's 2D corners, because the render
// mechanism at the time was a single canvas overlaid on the section, manually synced to
// each card's DOM position. Now that CoverFrameSlot3D/CoverFrame3DView (via drei's <View>)
// live INSIDE each SpellCard and read that card's own real position directly, there's
// nothing left for a caller to build per-card -- SpellCard decides for itself (via its own
// show3D prop, straight from this hook's return value) whether to render 2D or 3D corners.
export const useCoverFrame3DSection = (sectionRef: React.RefObject<HTMLElement | null>): boolean =>
  useCoverFrame3DGate(sectionRef);
