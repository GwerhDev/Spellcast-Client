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
}

// Base square size (px) of the interactive hit box around each companion, scaled up with
// placement.scale so the pointer target grows with the model. Only these small boxes
// intercept pointer events — the rest of the page keeps scrolling/clicking normally.
const BASE_HIT_AREA_SIZE = 220;
const ROTATE_SENSITIVITY = 0.01;
const SCALE_SENSITIVITY = 0.001;
// Scene units per screen pixel. The orthographic camera maps 1 world unit to this many
// pixels, so a placement at screen (x, y) lands at a matching world position and models
// keep a consistent on-screen size regardless of the overlay's pixel dimensions.
const PIXELS_PER_UNIT = 90;
const DEFAULT_PLACEMENT: Omit<CompanionPlacement, 'x' | 'y'> = { rotationX: 0, rotationY: 0, scale: 1 };

type DragMode = 'move' | 'rotate';

// ── One HTML hit box per model ─────────────────────────────────────────────────────────
// The WebGL <Canvas> below is a SINGLE shared context (pointer-events: none). All gestures
// are captured here in the DOM instead: previously each model owned its own <Canvas>, which
// meant one WebGL context per cat — navigating in/out of the reader fast piled up contexts
// until the browser force-lost the oldest ones and three.js crashed the tab (SIGILL) drawing
// against a dead context. A single context removes that failure mode entirely.
interface HitBoxProps {
  model: CompanionModel;
  placement: CompanionPlacement;
  onStartDrag: (e: React.PointerEvent) => void;
  onScale: (dScale: number) => void;
  onCtrlHoverChange: (hovered: boolean) => void;
}

const CompanionModelHitBox: React.FC<HitBoxProps> = ({ model, placement, onStartDrag, onScale, onCtrlHoverChange }) => {
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
      style={{
        width: hitBoxSize,
        height: hitBoxSize,
        left: placement.x - hitBoxSize / 2,
        top: placement.y - hitBoxSize / 2,
      }}
      onPointerDown={onStartDrag}
      onMouseMove={e => onCtrlHoverChange(e.ctrlKey || e.metaKey)}
      onMouseLeave={() => onCtrlHoverChange(false)}
    />
  );
};

// Bridges React state into r3f's on-demand render loop. Under frameloop="demand" r3f only
// paints when something calls invalidate(); a plain React re-render of scene props does not
// guarantee a frame. This runs r3f's real invalidate() whenever `signal` changes (bumped by
// every drag/rotate/scale/hover), so the shared canvas repaints exactly on gesture and stays
// idle otherwise.
const RenderOnSignal: React.FC<{ signal: number }> = ({ signal }) => {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [signal, invalidate]);
  return null;
};

// ── One rendered model inside the shared canvas ────────────────────────────────────────
// Positioned in world space from the model's screen-pixel placement via the orthographic
// pixel camera. Screen y grows downward, world y grows upward, so y is negated.
const CompanionSceneModel: React.FC<{
  model: CompanionModel;
  companionScale: number;
  placement: CompanionPlacement;
  overlaySize: { width: number; height: number };
  highlighted: boolean;
}> = ({ model, companionScale, placement, overlaySize, highlighted }) => {
  const worldX = (placement.x - overlaySize.width / 2) / PIXELS_PER_UNIT;
  const worldY = -(placement.y - overlaySize.height / 2) / PIXELS_PER_UNIT;
  return (
    <group position={[worldX, worldY, 0]} rotation={[placement.rotationX, placement.rotationY, 0]}>
      <CatModel
        color={model.color}
        modelUrl={model.modelUrl}
        scale={companionScale * placement.scale}
        highlighted={highlighted}
      />
    </group>
  );
};

// Presentational only (Layer 4) — receives the resolved companion and its persisted
// placements by props, no Redux; SpellReader owns the store round-trip. Companions are
// static, user-placed props: plain drag repositions, Ctrl+drag rotates in place, Ctrl+wheel
// resizes (with a Ctrl-hover outline as a hint), all relative deltas reported upward.
//
// Rendering strategy: ONE shared WebGL <Canvas> covering the overlay, with a per-model HTML
// hit box on top for input. frameloop="demand" keeps it idle (no walk animation yet) — it
// only redraws when a drag/rotate/scale invalidates it — so the reader pays almost no GPU
// cost while a companion just sits there.
export const CompanionOverlay: React.FC<Props> = ({ companion, placements, onMove, onRotate, onScale }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ modelId: string; mode: DragMode } | null>(null);
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const [ctrlHoveredId, setCtrlHoveredId] = useState<string | null>(null);
  // Bumped on every gesture; RenderOnSignal (inside the Canvas) turns this into an r3f
  // invalidate() so frameloop="demand" paints the next frame.
  const [renderSignal, setRenderSignal] = useState(0);
  const invalidate = () => setRenderSignal(t => t + 1);

  // Measure the overlay so screen-pixel placements map to world coordinates, and keep it in
  // sync on resize / fullscreen toggle.
  useLayoutEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const measure = () => setOverlaySize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tracked on window (not the small hit box) so a fast drag that briefly leaves the box
  // doesn't drop the gesture.
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const active = drag.current;
      if (!active) return;
      if (active.mode === 'rotate') {
        onRotate(active.modelId, e.movementY * ROTATE_SENSITIVITY, e.movementX * ROTATE_SENSITIVITY);
      } else {
        onMove(active.modelId, e.movementX, e.movementY);
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
  }, [onMove, onRotate]);

  const halfW = overlaySize.width / 2 / PIXELS_PER_UNIT;
  const halfH = overlaySize.height / 2 / PIXELS_PER_UNIT;

  return (
    <div ref={overlayRef} className={s.overlay} data-testid="companion-overlay">
      {overlaySize.width > 0 && (
        <Canvas
          className={s.canvas}
          frameloop="demand"
          gl={{ alpha: true, powerPreference: 'low-power' }}
          orthographic
          camera={{ position: [0, 0, 10], near: 0.1, far: 100, zoom: 1, left: -halfW, right: halfW, top: halfH, bottom: -halfH }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <RenderOnSignal signal={renderSignal} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[2, 4, 2]} intensity={0.6} />
          {companion.models.map((model, i) => {
            const placement = placements[model.id] ?? { x: 80 + i * 140, y: 80, ...DEFAULT_PLACEMENT };
            return (
              <CompanionSceneModel
                key={model.id}
                model={model}
                companionScale={companion.scale ?? 1}
                placement={placement}
                overlaySize={overlaySize}
                highlighted={ctrlHoveredId === model.id}
              />
            );
          })}
        </Canvas>
      )}
      {companion.models.map((model, i) => {
        const placement = placements[model.id] ?? { x: 80 + i * 140, y: 80, ...DEFAULT_PLACEMENT };
        return (
          <CompanionModelHitBox
            key={model.id}
            model={model}
            placement={placement}
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
          />
        );
      })}
    </div>
  );
};
