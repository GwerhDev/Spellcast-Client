import React from 'react';
import { Canvas } from '@react-three/fiber';
import { View } from '@react-three/drei';
import { useCoverFrame3DInvalidate } from '../../../hooks/useCoverFrame3DInvalidate';

// TCORE-124: the ONE shared <Canvas>/WebGL context for the whole app's 3D cover-frame
// objects -- mounted once here (in DefaultLayout.tsx, on .dashboard-container, a sibling of
// the sidebar rather than a descendant of it) and reused by every section via drei's <View>.
// Browsers cap concurrent WebGL contexts (~8-16), and any grid of SpellCards can render
// 20-50+ at once, so one context per card (or even one context per SECTION, an earlier
// design here) was ruled out -- see CoverFrame's own comment in config/assets/types.ts.
//
// Mounted on .dashboard-container specifically, NOT .app-viewer (where this used to live):
// .app-viewer's own width reflows for ~220ms every time the sidebar's rail<->panel toggle
// animates (a plain CSS `transition: width`), and drei's <View> converts each card's live
// DOM rect into a WebGL scissor rect using THIS canvas' own measured size (react-three-
// fiber's ResizeObserver-driven `useThree().size`) -- during that reflow the card's rect was
// always fresh (read live every frame) but the canvas' own size lagged a frame or more
// behind, so the 3D content visibly detached from the card underneath it. .dashboard-
// container's own box is width:100% of .app-container, provably unaffected by how the
// sidebar and viewer split that width between them (see globals.css), so it never reflows
// from this. See DefaultLayout.tsx's own comment on the mount point, and .nav-container's
// own `isolation: isolate` (globals.css) -- this canvas now geometrically spans the
// sidebar's screen area too, so the sidebar needs its own stacking context to guarantee it
// keeps painting on top regardless of DOM/z-index order.
//
// Why <View> replaces the earlier "one full-viewport canvas + manually sync mesh positions
// to each card's DOM rect every rAF tick" design: that mesh-position-mirroring approach had
// two real, structural problems, not just cosmetic ones --
//   1. A visible one-frame-ish delay between a card's real DOM position (scroll, sidebar
//      toggle, any layout change) and the mesh catching up, because the sync ran in a
//      SEPARATE requestAnimationFrame loop from the browser's own layout/paint, reading
//      getBoundingClientRect() after the fact rather than being part of the same paint.
//   2. The canvas had to be position: fixed to the whole viewport to guarantee covering
//      every possible card position, which put it in its own top-level stacking context
//      competing with real page chrome (the sidebar) that has no z-index of its own in
//      desktop layout -- any positive z-index on the fixed canvas could paint over it.
// <View> fixes both by giving each card a real DOM element (a plain <div>, HtmlView below)
// that lives in its own normal position in the page -- inheriting the correct stacking
// context automatically, zero manual z-index -- and reads that element's rect from INSIDE
// r3f's own useFrame render loop (same pass that paints, not a parallel rAF), using
// gl.setScissor to draw only that screen rectangle from ONE shared scene/context. See
// CoverFrame3DView.tsx for the per-card wrapper.
export const CoverFrame3DRoot: React.FC = () => {
  // TCORE-127: everything that has to call invalidate() for demand mode below to actually
  // stay in sync (scroll/resize/layout-affecting CSS transitions) -- see that hook's own
  // comment. Scoped to live here (not e.g. DefaultLayout) so it only ever runs while this
  // Canvas itself is mounted, matching frameloop="demand"'s own lifetime exactly.
  useCoverFrame3DInvalidate();

  return (
    <Canvas
      data-testid="cover-frame-3d-root"
      style={{
        position: 'absolute',
        inset: 0,
        // Every real card position is captured by its own tracked <View>'s <div> (a normal,
        // in-flow DOM element) -- this root canvas is purely the shared WebGL surface those
        // views scissor-draw into, so it must never itself intercept pointer events or it
        // would sit as an invisible click-blocking layer over the whole .dashboard-container.
        pointerEvents: 'none',
        // A LOW z-index, not a high one -- this only ever needs to paint ABOVE plain page
        // content (SpellCard covers, which carry no z-index of their own), never above real
        // UI chrome like modals/menus/the audio player (all much higher, see globals.css).
        // This canvas now geometrically spans .dashboard-container's full box, sidebar
        // included -- .nav-container's own `isolation: isolate` (globals.css) is what actually
        // keeps the sidebar on top, not this number; no z-index here can defeat that isolation
        // regardless of value, which is the point (see this file's own header comment).
        zIndex: 1,
      }}
      // TCORE-127: "demand", not "always" -- a continuous rAF loop used to tick every
      // browser frame regardless of whether any tracked card was actually visible or
      // moving, which is real, avoidable cost while Mode3D is on but nothing on screen is
      // changing. useCoverFrame3DInvalidate() (above) covers every case that moves a
      // tracked card WITHOUT r3f noticing on its own (scroll, resize, layout-affecting CSS
      // transitions); r3f's own reconciler already auto-invalidates on scene-graph changes
      // (a <View> mounting/unmounting -- a card list changing -- or its `visible` prop
      // toggling -- a View entering/leaving the viewport gate), so neither of those needs
      // separate wiring here.
      frameloop="demand"
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
    >
      {/* No lights here -- each <View> (CoverFrame3DView) portals its own children into ITS
          OWN separate virtual scene (confirmed by reading drei's View.js), not this root
          canvas' top-level scene, so lights declared here would never reach anything a View
          renders. Each CoverFrame3DView brings its own lights instead. */}
      <View.Port />
    </Canvas>
  );
};
