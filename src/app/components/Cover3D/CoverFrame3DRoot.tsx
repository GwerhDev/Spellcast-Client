import React from 'react';
import { Canvas } from '@react-three/fiber';
import { View } from '@react-three/drei';

// TCORE-124: the ONE shared <Canvas>/WebGL context for the whole app's 3D cover-frame
// corners -- mounted once here (inside .app-viewer, DefaultLayout's own real-content area,
// sibling to the sidebar rather than a descendant of it) and reused by every section via
// drei's <View>. Browsers cap concurrent WebGL contexts (~8-16), and any grid of SpellCards
// can render 20-50+ at once, so one context per card (or even one context per SECTION, the
// previous design here) was ruled out -- see CoverFrame's own comment in
// config/assets/types.ts.
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
export const CoverFrame3DRoot: React.FC = () => (
  <Canvas
    data-testid="cover-frame-3d-root"
    style={{
      position: 'absolute',
      inset: 0,
      // Every real card position is captured by its own tracked <View>'s <div> (a normal,
      // in-flow DOM element) -- this root canvas is purely the shared WebGL surface those
      // views scissor-draw into, so it must never itself intercept pointer events or it
      // would sit as an invisible click-blocking layer over the whole .app-viewer.
      pointerEvents: 'none',
      // A LOW z-index, not a high one -- this only ever needs to paint ABOVE plain page
      // content (SpellCard covers, which carry no z-index of their own), never above real
      // UI chrome like modals/menus/the audio player (all much higher, see globals.css).
      // Scoped to .app-viewer (this canvas' own positioned ancestor, sibling to the
      // sidebar), so it can never reach the sidebar's stacking context at all regardless of
      // this value -- unlike the earlier viewport-fixed design, no number here can
      // accidentally paint over page chrome outside this container.
      zIndex: 1,
    }}
    // "always" (not "demand"): <View>'s own per-tracked-element scissor render happens
    // inside useFrame, which only runs while the loop is active -- an on-demand loop would
    // need every single tracked view to separately call invalidate() on every scroll/resize
    // of every card, which is exactly the kind of manual per-element sync this rewrite
    // exists to remove. The whole canvas is 0-sized (no visible content) unless at least one
    // View is actively tracking something on screen, so an idle route still costs nothing.
    frameloop="always"
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    eventSource={typeof document !== 'undefined' ? document.body : undefined}
  >
    <ambientLight intensity={1.1} />
    <directionalLight position={[40, 60, 80]} intensity={1.6} />
    <directionalLight position={[-30, -20, 60]} intensity={0.5} />
    <directionalLight position={[0, -40, 30]} intensity={0.4} color="#dff2ff" />
    <View.Port />
  </Canvas>
);
