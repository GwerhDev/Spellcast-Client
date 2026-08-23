import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { Companion, CompanionModel } from '../../../config/assets';
import type { CompanionPlacement } from '../../../store/userLibrarySlice';
import { CatModel } from './CatModel';
import s from './CompanionOverlay.module.css';

interface Props {
  companion: Companion;
  placements: Record<string, CompanionPlacement>;
  onMove: (modelId: string, dx: number, dy: number) => void;
  onRotate: (modelId: string, dRotationX: number, dRotationY: number) => void;
  onScale: (modelId: string, dScale: number) => void;
  onToggleDepth: (modelId: string) => void;
}

// Base square size (px) of the interactive hit box around each companion, scaled up with
// placement.scale so the pointer target grows with the model. Only these small boxes
// intercept pointer events — the rest of the page keeps scrolling/clicking normally.
const BASE_HIT_AREA_SIZE = 220;
const ROTATE_SENSITIVITY = 0.01;
const SCALE_SENSITIVITY = 0.001;
const DEFAULT_PLACEMENT: Omit<CompanionPlacement, 'x' | 'y'> = { rotationX: 0, rotationY: 0, scale: 1, inFront: true };
// Horizontal gap between each model's default x, must be >= BASE_HIT_AREA_SIZE so freshly
// unlocked/never-placed models don't start with overlapping hit boxes -- at the old 140px
// gap (less than the 220px box), two same-depth cats' hit areas overlapped by 80px and the
// one drawn later in the DOM always won that overlap, permanently blocking the other one's
// clicks in that strip until manually dragged apart first.
const DEFAULT_PLACEMENT_GAP = BASE_HIT_AREA_SIZE;
// The first model's default x/y must themselves be >= half the hit box size, or the
// resize-clamp effect immediately nudges just that one model inward on mount (its box
// would otherwise start partly off the overlay's top-left) while the others are left
// alone -- shrinking the real gap between it and its neighbor below DEFAULT_PLACEMENT_GAP
// and reintroducing the exact overlap this default is meant to avoid.
const DEFAULT_PLACEMENT_ORIGIN = BASE_HIT_AREA_SIZE / 2;
const defaultPlacementFor = (index: number): CompanionPlacement => ({
  x: DEFAULT_PLACEMENT_ORIGIN + index * DEFAULT_PLACEMENT_GAP,
  y: DEFAULT_PLACEMENT_ORIGIN,
  ...DEFAULT_PLACEMENT,
});

// CSS z-index the reader's paper sheet sits at (see SpellReader/index.module.css's
// .paperSheet / .textContainer -- both plain, unpositioned-by-z-index elements, so
// "in front of the page" only has to mean "above whatever the page's own stacking
// context would otherwise put it at"). A cat's <canvas> goes just above this when
// inFront, just below when not -- real per-model comparison, not an all-or-nothing
// canvas swap, because each cat is its own small <canvas>/stacking context instead of
// all cats sharing one big canvas layered once relative to the page.
const PAGE_Z_INDEX = 4;

type DragMode = 'move' | 'rotate';

// Keeps a model's hit box (its real on-screen footprint, which grows with placement.scale)
// fully inside the overlay bounds -- shared by both the live drag clamp and the
// resize-triggered correction below so a cat placed near an edge and then pushed off-screen
// by a narrower window/viewport gets pulled back in too, not just during an active drag.
// When the box is wider/taller than the whole overlay (a heavily scaled-up cat in a very
// narrow reader), there's no position that keeps it fully inside either axis -- center it
// on that axis instead of leaving an inverted [min, max] range.
const clampAxis = (value: number, boxSize: number, overlayExtent: number) => {
  if (boxSize >= overlayExtent) return overlayExtent / 2;
  return Math.min(overlayExtent - boxSize / 2, Math.max(boxSize / 2, value));
};

const clampToOverlay = (x: number, y: number, scale: number, overlaySize: { width: number; height: number }) => {
  const boxSize = BASE_HIT_AREA_SIZE * scale;
  return {
    x: clampAxis(x, boxSize, overlaySize.width),
    y: clampAxis(y, boxSize, overlaySize.height),
  };
};

// ── One HTML hit box per model ─────────────────────────────────────────────────────────
// Drag/rotate/scale/depth-toggle gestures are all captured here in the DOM, never by the
// WebGL canvas itself (each cat's <canvas> stays pointer-events: none) — see
// CompanionCanvas below for why each cat still gets its own small canvas rather than one
// shared across the whole overlay.
interface HitBoxProps {
  model: CompanionModel;
  placement: CompanionPlacement;
  onStartDrag: (e: React.PointerEvent) => void;
  onScale: (dScale: number) => void;
  onCtrlHoverChange: (hovered: boolean) => void;
  onToggleDepth: () => void;
  // True when this model's hit box is the one nearest the pointer among any it currently
  // overlaps with another model at the same depth -- see nearestOverlapAt/the window
  // mousemove listener in CompanionOverlay. Bumps this box's z-index just enough to win
  // that tie, so a model whose default/dragged position ended up fully behind another
  // same-depth one can still always be re-grabbed by pointing at the part of its box the
  // other one doesn't cover, instead of being permanently stuck under it.
  isNearestOnOverlap: boolean;
}

const CompanionModelHitBox: React.FC<HitBoxProps> = ({ model, placement, onStartDrag, onScale, onCtrlHoverChange, onToggleDepth, isNearestOnOverlap }) => {
  const hitBoxRef = useRef<HTMLDivElement>(null);

  // React attaches its synthetic onWheel listener as passive, so preventDefault() inside a
  // React handler is silently ignored and the browser still applies its native Ctrl+wheel
  // page-zoom gesture. A real addEventListener with { passive: false } is required to block it.
  useEffect(() => {
    const el = hitBoxRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      onScale(-e.deltaY * SCALE_SENSITIVITY);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [onScale]);

  useEffect(() => {
    const handleKeyChange = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') onCtrlHoverChange(false);
    };
    window.addEventListener('keyup', handleKeyChange);
    return () => window.removeEventListener('keyup', handleKeyChange);
  }, [onCtrlHoverChange]);

  const hitBoxSize = BASE_HIT_AREA_SIZE * placement.scale;

  return (
    <div
      ref={hitBoxRef}
      className={s.hitArea}
      data-testid={`companion-hit-area-${model.id}`}
      title={`Ctrl+Shift+click: ${placement.inFront ? 'send behind the page' : 'bring in front of the page'}`}
      style={{
        width: hitBoxSize,
        height: hitBoxSize,
        left: placement.x - hitBoxSize / 2,
        top: placement.y - hitBoxSize / 2,
        // Match the model's own depth so the hit box itself doesn't sit stuck above the
        // page when the cat is sent behind it -- otherwise you could never re-select a
        // cat you'd hidden behind the sheet to bring it back. +2 (not +1) when this box
        // wins the nearest-on-overlap tiebreak so it clears the OTHER overlapping model's
        // own depth-based z-index too, not just the page's.
        zIndex: (placement.inFront ? PAGE_Z_INDEX + 1 : PAGE_Z_INDEX - 1) + (isNearestOnOverlap ? 2 : 0),
      }}
      onPointerDown={e => {
        // Ctrl/Cmd+Shift+click toggles depth instead of starting a rotate-drag -- checked
        // before onStartDrag's own Ctrl-only rotate branch so Shift cleanly overrides it.
        if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
          e.stopPropagation();
          onToggleDepth();
          return;
        }
        onStartDrag(e);
      }}
      onMouseMove={e => onCtrlHoverChange(e.ctrlKey || e.metaKey)}
      onMouseLeave={() => onCtrlHoverChange(false)}
    />
  );
};

// Bridges React state into r3f's on-demand render loop. Under frameloop="demand" r3f only
// paints when something calls invalidate(); a plain React re-render of scene props does not
// guarantee a frame. This runs r3f's real invalidate() whenever `signal` changes (bumped by
// every drag/rotate/scale/hover), so the canvas repaints exactly on gesture and stays idle
// otherwise.
const RenderOnSignal: React.FC<{ signal: number }> = ({ signal }) => {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [signal, invalidate]);
  return null;
};

// ── One small WebGL canvas per model ───────────────────────────────────────────────────
// The page (an ordinary HTML element, not part of any scene) and each cat need to be able
// to occlude one another individually -- one cat in front of the page, another behind it,
// at the same time. A single <canvas> is one flat sheet of pixels: it can only sit
// entirely in front of or entirely behind an HTML element, never partially, so real
// per-model depth requires each model to be its own stacking-context layer comparable to
// the page's via a normal CSS z-index. That means back to one WebGL context per model
// (like before 0301060's shared-canvas fix) -- but bounded here to at most
// companion.models.length live contexts (2 today), released on unmount, not the
// unbounded accumulate-until-crash pattern that fix addressed (repeatedly entering/
// leaving the reader without ever tearing a context down).
const CompanionCanvas: React.FC<{
  model: CompanionModel;
  companionScale: number;
  placement: CompanionPlacement;
  highlighted: boolean;
  renderSignal: number;
}> = ({ model, companionScale, placement, highlighted, renderSignal }) => {
  const size = BASE_HIT_AREA_SIZE * placement.scale;
  return (
    <Canvas
      className={s.catCanvas}
      data-testid={`companion-canvas-${model.id}`}
      style={{
        width: size,
        height: size,
        left: placement.x - size / 2,
        top: placement.y - size / 2,
        zIndex: placement.inFront ? PAGE_Z_INDEX + 1 : PAGE_Z_INDEX - 1,
      }}
      frameloop="demand"
      gl={{ alpha: true, powerPreference: 'low-power' }}
      orthographic
      camera={{ position: [0, 0, 10], near: 0.1, far: 100, zoom: 90 }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <RenderOnSignal signal={renderSignal} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 2]} intensity={0.6} />
      <group rotation={[placement.rotationX, placement.rotationY, 0]}>
        <CatModel
          color={model.color}
          modelUrl={model.modelUrl}
          scale={companionScale * placement.scale}
          highlighted={highlighted}
        />
      </group>
    </Canvas>
  );
};

// Presentational only (Layer 4) — receives the resolved companion and its persisted
// placements by props, no Redux; SpellReader owns the store round-trip. Companions are
// static, user-placed props: plain drag repositions, Ctrl+drag rotates in place, Ctrl+wheel
// resizes (with a Ctrl-hover outline as a hint), Ctrl+Shift+click sends in front of/behind
// the page, all relative deltas/toggles reported upward.
export const CompanionOverlay: React.FC<Props> = ({ companion, placements, onMove, onRotate, onScale, onToggleDepth }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ modelId: string; mode: DragMode } | null>(null);
  const [ctrlHoveredId, setCtrlHoveredId] = useState<string | null>(null);
  // Whichever model's hit box the pointer is over AND whose center it's currently closest
  // to, among only the models it's over -- null when the pointer isn't over any hit box, or
  // is over just one. Recomputed on every pointer move over the overlay (not per hit box:
  // breaking a tie needs comparing every model at once, not just the one under the cursor).
  const [nearestOverlapId, setNearestOverlapId] = useState<string | null>(null);
  // Keeps a model's hit box (and its canvas) fully inside the reader viewport -- measured
  // so the clamp below tracks real available space instead of a guessed constant, and
  // stays correct through window resizes / fullscreen toggle / sidebar collapse.
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  // Bumped on every gesture; RenderOnSignal (inside each model's Canvas) turns this into
  // an r3f invalidate() so frameloop="demand" repaints exactly on gesture.
  const [renderSignal, setRenderSignal] = useState(0);
  const invalidate = () => setRenderSignal(t => t + 1);

  // For a pointer at overlay-relative (px, py), which models' hit boxes actually contain
  // that point, and which of those has its center closest to it -- the nearest one is the
  // one that should win a same-depth z-index tie so it stays reachable even fully behind
  // another model's box. Declared before the effects below (not just above the JSX) since
  // the window mousemove listener effect calls it -- as a plain function (not useCallback)
  // it's recreated every render anyway, so hoisting only affects readability, not behavior.
  const nearestOverlapAt = (px: number, py: number): string | null => {
    let best: { id: string; dist: number } | null = null;
    let overlapCount = 0;
    companion.models.forEach((model, i) => {
      const placement = placements[model.id] ?? defaultPlacementFor(i);
      const half = (BASE_HIT_AREA_SIZE * placement.scale) / 2;
      const withinBox = Math.abs(px - placement.x) <= half && Math.abs(py - placement.y) <= half;
      if (!withinBox) return;
      overlapCount++;
      const dist = Math.hypot(px - placement.x, py - placement.y);
      if (!best || dist < best.dist) best = { id: model.id, dist };
    });
    // Only meaningful with 2+ boxes actually covering this point -- otherwise there's no
    // tie to break, and forcing a z-index bump on a single hovered box would be a no-op
    // that's cheaper to just skip.
    return overlapCount >= 2 && best ? (best as { id: string; dist: number }).id : null;
  };

  useLayoutEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const measure = () => setOverlaySize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A placement that was fine at one viewport size can end up partially/fully off-screen
  // after the reader shrinks (window resize, fullscreen toggle, sidebar expanding) -- pull
  // any such model back in as soon as the new size is known, not just during a live drag.
  useEffect(() => {
    if (overlaySize.width === 0 || overlaySize.height === 0) return;
    companion.models.forEach((model, i) => {
      // Same fallback the render below uses for an unplaced model -- a narrow enough
      // reader can put even this default off-screen, so it needs the same correction a
      // persisted placement gets.
      const current = placements[model.id] ?? defaultPlacementFor(i);
      const clamped = clampToOverlay(current.x, current.y, current.scale, overlaySize);
      if (clamped.x !== current.x || clamped.y !== current.y) {
        onMove(model.id, clamped.x - current.x, clamped.y - current.y);
      }
    });
    // Deliberately omits onMove/placements: this must only re-run when the overlay itself
    // is resized, not on every placement change -- including placements/onMove would
    // re-trigger from the very onMove calls this effect makes (placements is a new object
    // each dispatch), and onMove's identity isn't stable across SpellReader renders anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlaySize, companion.models]);

  // Tracked on window (not the small hit box) so a fast drag that briefly leaves the box
  // doesn't drop the gesture.
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const active = drag.current;
      if (!active) return;
      if (active.mode === 'rotate') {
        onRotate(active.modelId, e.movementY * ROTATE_SENSITIVITY, e.movementX * ROTATE_SENSITIVITY);
      } else {
        // Clamp the reported delta (not just the resulting placement after the fact) so a
        // fast drag can't overshoot past the edge for a frame before snapping back -- the
        // cat's hit box must stay fully inside the measured overlay at every step, never
        // partially or fully off-viewport.
        const current = placements[active.modelId];
        if (current && overlaySize.width > 0 && overlaySize.height > 0) {
          const clamped = clampToOverlay(current.x + e.movementX, current.y + e.movementY, current.scale, overlaySize);
          onMove(active.modelId, clamped.x - current.x, clamped.y - current.y);
        } else {
          onMove(active.modelId, e.movementX, e.movementY);
        }
      }
      invalidate();
    };
    const handleUp = () => {
      drag.current = null;
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [onMove, onRotate, placements, overlaySize]);

  // Tracked on window rather than the hit boxes themselves: a box that's currently losing
  // the same-depth z-index tie never receives its own mouse events (pointer-events + the
  // browser's normal hit-testing route them to whichever box is on top), so there's no way
  // to detect "the pointer is over the LOSING box too" from inside either box. A window
  // listener sees every mouse position regardless of which element the browser thinks is on
  // top, so the tiebreak can be computed independently of which box currently wins z-index.
  useEffect(() => {
    const el = overlayRef.current;
    const handleHoverMove = (e: MouseEvent) => {
      if (drag.current || !el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nearest = nearestOverlapAt(x, y);
      setNearestOverlapId(prev => (prev === nearest ? prev : nearest));
    };
    window.addEventListener('mousemove', handleHoverMove);
    return () => window.removeEventListener('mousemove', handleHoverMove);
    // nearestOverlapAt closes over companion/placements, both fresh every render, so this
    // effect intentionally re-subscribes whenever they change to avoid a stale closure --
    // cheap since it's just swapping one window listener, not doing any measurement itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companion.models, placements]);

  return (
    <div ref={overlayRef} className={s.overlay} data-testid="companion-overlay">
      {companion.models.map((model, i) => {
        const placement = placements[model.id] ?? defaultPlacementFor(i);
        return (
          <CompanionCanvas
            key={model.id}
            model={model}
            companionScale={companion.scale ?? 1}
            placement={placement}
            highlighted={ctrlHoveredId === model.id}
            renderSignal={renderSignal}
          />
        );
      })}
      {companion.models.map((model, i) => {
        const placement = placements[model.id] ?? defaultPlacementFor(i);
        return (
          <CompanionModelHitBox
            key={model.id}
            model={model}
            placement={placement}
            isNearestOnOverlap={nearestOverlapId === model.id}
            onStartDrag={e => {
              e.stopPropagation();
              drag.current = { modelId: model.id, mode: e.ctrlKey || e.metaKey ? 'rotate' : 'move' };
            }}
            onScale={dScale => {
              onScale(model.id, dScale);
              invalidate();
            }}
            onCtrlHoverChange={hovered => {
              setCtrlHoveredId(prev => (hovered ? model.id : prev === model.id ? null : prev));
              invalidate();
            }}
            onToggleDepth={() => {
              onToggleDepth(model.id);
              invalidate();
            }}
          />
        );
      })}
    </div>
  );
};
