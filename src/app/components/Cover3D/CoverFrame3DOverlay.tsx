import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CoverFrameMesh } from './CoverFrameMesh';
import type { CoverFrame3DConfig } from '../../../utils/coverFrame';

// TCORE-124: ONE shared <Canvas>/WebGL context for the whole Last Spells section -- browsers
// cap concurrent WebGL contexts (~8-16), and this section can render 20-50+ cards, so one
// context per card was ruled out (see CoverFrame's own comment in config/assets/types.ts).
// Each card contributes a DOM anchor (its own .coverWrapper, already rendered by SpellCard --
// untouched by this work) whose on-screen rect this overlay reads every frame-ish and
// mirrors into 3D-space mesh positions, via an orthographic camera calibrated 1 scene unit
// == 1 CSS px so "rect in px" maps directly to "position in the scene" with no separate
// projection math.

const CORNER_SIZE = 28; // matches CoverFrameCorners' own CORNER_SIZE
const CORNER_OVERHANG = 2;
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

export interface CardFrameAnchor {
  id: string;
  config: CoverFrame3DConfig;
  // The card's own cover box (matches SpellCard's .coverWrapper), read fresh every sync
  // tick -- not stored as state, since during a carousel scroll this changes on nearly
  // every frame and re-rendering React for it would defeat the point of an on-demand r3f
  // frameloop.
  getRect: () => DOMRect | null;
}

// left/top are the container's OWN on-screen position (getBoundingClientRect(), viewport-
// relative px) -- needed because anchor.getRect() also returns viewport-relative rects, and
// the two must be in the same coordinate space before subtracting one from the other to get
// a position relative to the canvas itself. Without this, a card is positioned as if the
// canvas started at the browser viewport's own (0,0) instead of wherever the section
// actually sits on the page.
interface SceneProps {
  anchors: CardFrameAnchor[];
  viewportSize: { width: number; height: number; left: number; top: number };
}

// One mesh group per corner/medallion slot of one card, repositioned every sync tick by
// directly mutating the group's own position -- cheaper than re-rendering a React tree of N
// cards x 6 pieces on every scroll tick, and is exactly what r3f's imperative escape hatch
// (refs + a plain rAF loop) is for.
const CardFrameMeshes: React.FC<{ anchor: CardFrameAnchor; viewportSize: SceneProps['viewportSize'] }> = ({ anchor, viewportSize }) => {
  const groupRef = useRef<import('three').Group>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    let raf = 0;
    let lastKey = '';
    const sync = () => {
      const rect = anchor.getRect();
      const group = groupRef.current;
      if (rect && group) {
        const localLeft = rect.left - viewportSize.left;
        const localTop = rect.top - viewportSize.top;
        const x = localLeft + rect.width / 2 - viewportSize.width / 2;
        const y = viewportSize.height / 2 - (localTop + rect.height / 2);
        const key = `${x.toFixed(1)}:${y.toFixed(1)}:${rect.width.toFixed(1)}`;
        group.position.set(x, y, 0);
        group.visible = true;
        // frameloop="demand" only repaints on invalidate() -- only call it when the
        // position actually changed (not every rAF tick) so an idle carousel doesn't spend
        // GPU time redrawing an identical frame 60x/sec.
        if (key !== lastKey) { lastKey = key; invalidate(); }
      } else if (group) {
        if (group.visible) invalidate();
        group.visible = false;
      }
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [anchor, viewportSize, invalidate]);

  const { corner3dUrl, medallion3dUrl } = anchor.config;

  return (
    <group ref={groupRef} visible={false}>
      {/* 4 corners, matching CoverFrameCorners' own placement/mirroring exactly -- centered
          on the card's own edge/corner via a translate, half overhanging past it, same as
          the 2D mechanism's "bolted-on plate" look. */}
      <CornerSet corner3dUrl={corner3dUrl} medallion3dUrl={medallion3dUrl} getRect={anchor.getRect} />
    </group>
  );
};

// Split out from CardFrameMeshes so the group's own position sync (above, imperative) stays
// separate from the four corners + optional medallion's own layout (declarative) -- the
// corners need the card's half-width/height to sit exactly ON its edges. Measured once on
// mount (and whenever getRect's identity changes, i.e. a different card) rather than every
// sync tick like the group's own position -- a card's own size essentially never changes
// mid-session, unlike its scroll position.
const CornerSet: React.FC<{ corner3dUrl: string; medallion3dUrl?: string; getRect: () => DOMRect | null }> = ({ corner3dUrl, medallion3dUrl, getRect }) => {
  const [halfSize, setHalfSize] = useState<{ w: number; h: number } | null>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    const rect = getRect();
    if (rect) setHalfSize({ w: rect.width / 2, h: rect.height / 2 });
  }, [getRect]);

  // frameloop="demand" needs an explicit invalidate() once the corner meshes actually have
  // a size to render at (halfSize resolves) and again once their SVG geometry finishes
  // loading via Suspense (this component re-mounts when the thrown promise resolves) --
  // neither of those is a card-position change, so CardFrameMeshes' own sync loop (which
  // only invalidates on a position delta) wouldn't otherwise trigger a repaint for them.
  useEffect(() => {
    if (halfSize) invalidate();
  }, [halfSize, invalidate]);

  if (!halfSize) return null;

  return (
    <>
      <group position={[halfSize.w - CORNER_SIZE / 2 + CORNER_OVERHANG, halfSize.h - CORNER_SIZE / 2 + CORNER_OVERHANG, 0]} rotation={[0, Math.PI, 0]}>
        <CoverFrameMesh url={corner3dUrl} size={CORNER_SIZE} />
      </group>
      <group position={[-(halfSize.w - CORNER_SIZE / 2 + CORNER_OVERHANG), halfSize.h - CORNER_SIZE / 2 + CORNER_OVERHANG, 0]} scale={[-1, 1, 1]} rotation={[0, Math.PI, 0]}>
        <CoverFrameMesh url={corner3dUrl} size={CORNER_SIZE} />
      </group>
      <group position={[halfSize.w - CORNER_SIZE / 2 + CORNER_OVERHANG, -(halfSize.h - CORNER_SIZE / 2 + CORNER_OVERHANG), 0]} scale={[1, -1, 1]} rotation={[0, Math.PI, 0]}>
        <CoverFrameMesh url={corner3dUrl} size={CORNER_SIZE} />
      </group>
      <group position={[-(halfSize.w - CORNER_SIZE / 2 + CORNER_OVERHANG), -(halfSize.h - CORNER_SIZE / 2 + CORNER_OVERHANG), 0]} scale={[-1, -1, 1]} rotation={[0, Math.PI, 0]}>
        <CoverFrameMesh url={corner3dUrl} size={CORNER_SIZE} />
      </group>
      {medallion3dUrl && (
        <>
          <group position={[0, halfSize.h, 0]}>
            <CoverFrameMesh url={medallion3dUrl} size={MEDALLION_WIDTH} gem={{ radiusRatio: GEM_RADIUS_RATIO, color: GEM_COLOR }} />
          </group>
          <group position={[0, -halfSize.h, 0]} scale={[1, -1, 1]}>
            <CoverFrameMesh url={medallion3dUrl} size={MEDALLION_WIDTH} gem={{ radiusRatio: GEM_RADIUS_RATIO, color: GEM_COLOR }} />
          </group>
        </>
      )}
    </>
  );
};

// No <Environment> (drei's HDRI presets fetch from a remote CDN, and a metallic material
// with no envMap renders close to black -- see CoverFrameMesh's own comment). Plain local
// lights only -- a third rim light (low intensity, from behind/above) gives the bevel edges
// and the gem's clearcoat a sharper specular highlight than two lights alone, without
// needing any environment reflection source.
const Scene: React.FC<SceneProps> = ({ anchors, viewportSize }) => (
  <>
    <ambientLight intensity={1.1} />
    <directionalLight position={[40, 60, 80]} intensity={1.6} />
    <directionalLight position={[-30, -20, 60]} intensity={0.5} />
    <directionalLight position={[0, -40, 30]} intensity={0.4} color="#dff2ff" />
    <Suspense fallback={null}>
      {anchors.map(anchor => (
        <CardFrameMeshes key={anchor.id} anchor={anchor} viewportSize={viewportSize} />
      ))}
    </Suspense>
  </>
);

interface CoverFrame3DOverlayProps {
  containerRef: React.RefObject<HTMLElement | null>;
  anchors: CardFrameAnchor[];
}

// Mounted by LastSpells only once its own gating (Mode3D user setting + desktop +
// !reduced-motion + section-in-viewport, see useCoverFrame3DGate) passes -- this component
// itself stays gate-agnostic, it just owns the shared canvas and DOM<->3D sync once asked to
// exist at all.
export const CoverFrame3DOverlay: React.FC<CoverFrame3DOverlayProps> = ({ containerRef, anchors }) => {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0, left: 0, top: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    let last = { width: 0, height: 0, left: 0, top: 0 };
    // A continuous rAF re-measure (not just ResizeObserver + a scroll listener) -- the
    // container's SIZE staying the same doesn't mean its POSITION did: opening/closing the
    // app's sidebar shifts everything to its right without resizing it, which ResizeObserver
    // never fires for and there's no single DOM event to listen for either (it's a CSS
    // transition on an unrelated ancestor element). Every card's own group already re-syncs
    // its position every frame via anchor.getRect() in CardFrameMeshes -- but those positions
    // are computed relative to THIS container's rect, so if this rect goes stale the whole
    // overlay silently drifts away from the real cards, exactly what re-measuring here fixes.
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // A rect of 0x0 here means "not laid out yet this instant" (e.g. a reflow mid-flight
      // right as this mounts), not "the section is actually zero-sized" -- setting
      // viewportSize to 0x0 would permanently hide the canvas below. Skip the update (keep
      // retrying) instead of committing a bogus empty measurement.
      if (rect.width > 0 && rect.height > 0) {
        const next = { width: rect.width, height: rect.height, left: rect.left, top: rect.top };
        if (next.width !== last.width || next.height !== last.height || next.left !== last.left || next.top !== last.top) {
          last = next;
          setViewportSize(next);
        }
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [containerRef]);

  if (viewportSize.width === 0 || viewportSize.height === 0) return null;

  return (
    <Canvas
      data-testid="cover-frame-3d-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
      frameloop="demand"
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      orthographic
      camera={{
        left: -viewportSize.width / 2,
        right: viewportSize.width / 2,
        top: viewportSize.height / 2,
        bottom: -viewportSize.height / 2,
        near: 0.1,
        far: 1000,
        position: [0, 0, 100],
      }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Scene anchors={anchors} viewportSize={viewportSize} />
    </Canvas>
  );
};
