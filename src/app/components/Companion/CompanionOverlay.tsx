import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
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

// Base square size (px) of the interactive canvas around the companion, scaled up with
// placement.scale so the model never clips against the canvas/camera frustum as it grows.
// Keeping this small at scale 1 (instead of covering the whole reader) means only this
// small box intercepts pointer events — the rest of the page keeps scrolling/clicking
// normally.
const BASE_HIT_AREA_SIZE = 220;
const ROTATE_SENSITIVITY = 0.01;
const SCALE_SENSITIVITY = 0.001;
const DEFAULT_PLACEMENT: Omit<CompanionPlacement, 'x' | 'y'> = { rotationX: 0, rotationY: 0, scale: 1 };

type DragMode = 'move' | 'rotate';

interface HitAreaProps {
  model: CompanionModel;
  companionScale: number;
  placement: CompanionPlacement;
  onStartDrag: (e: ThreeEvent<PointerEvent>) => void;
  onScale: (dScale: number) => void;
}

// Isolated per-model so the native (non-passive) wheel listener and Ctrl-hover highlight
// state stay scoped to just this companion instance.
const CompanionModelHitArea: React.FC<HitAreaProps> = ({ model, companionScale, placement, onStartDrag, onScale }) => {
  const hitAreaRef = useRef<HTMLDivElement>(null);
  const [ctrlHovered, setCtrlHovered] = useState(false);

  // React attaches its synthetic onWheel listener as passive, so preventDefault() inside a
  // React handler is silently ignored and the browser still applies its native Ctrl+wheel
  // page-zoom gesture instead of resizing the model. A real addEventListener with
  // { passive: false } is required to actually block that default.
  useEffect(() => {
    const el = hitAreaRef.current;
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
      if (e.key === 'Control' || e.key === 'Meta') setCtrlHovered(false);
    };
    window.addEventListener('keyup', handleKeyChange);
    return () => window.removeEventListener('keyup', handleKeyChange);
  }, []);

  const hitAreaSize = BASE_HIT_AREA_SIZE * placement.scale;

  return (
    <div
      ref={hitAreaRef}
      className={s.hitArea}
      data-testid={`companion-hit-area-${model.id}`}
      style={{
        width: hitAreaSize,
        height: hitAreaSize,
        left: placement.x - hitAreaSize / 2,
        top: placement.y - hitAreaSize / 2,
      }}
      onMouseMove={e => setCtrlHovered(e.ctrlKey || e.metaKey)}
      onMouseLeave={() => setCtrlHovered(false)}
    >
      <Canvas
        className={s.canvas}
        gl={{ alpha: true }}
        camera={{ position: [0, 1.4, 2.4], fov: 35 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 4, 2]} intensity={0.6} />
        <group rotation={[placement.rotationX, placement.rotationY, 0]} onPointerDown={onStartDrag}>
          <CatModel
            color={model.color}
            modelUrl={model.modelUrl}
            scale={companionScale * placement.scale}
            highlighted={ctrlHovered}
          />
        </group>
      </Canvas>
    </div>
  );
};

// Presentational only (Layer 4) — receives the resolved companion and its persisted
// placements by props, no Redux; DocumentReader owns the store round-trip. Companions are
// static, user-placed props: plain drag repositions, Ctrl+drag rotates in place, Ctrl+wheel
// resizes (with a Ctrl-hover border highlight as a hint), all relative deltas reported
// upward, never local position state. Rendered above the document (see DocumentReader mount
// order) rather than as an ambient background, since there's no walk animation to justify
// hiding them behind the page.
export const CompanionOverlay: React.FC<Props> = ({ companion, placements, onMove, onRotate, onScale }) => {
  const drag = useRef<{ modelId: string; mode: DragMode } | null>(null);

  // Tracked on window (not the small hit-area div) so a fast drag that briefly leaves
  // the 220px box doesn't drop the gesture.
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const active = drag.current;
      if (!active) return;
      if (active.mode === 'rotate') {
        onRotate(active.modelId, e.movementY * ROTATE_SENSITIVITY, e.movementX * ROTATE_SENSITIVITY);
      } else {
        onMove(active.modelId, e.movementX, e.movementY);
      }
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

  return (
    <div className={s.overlay} data-testid="companion-overlay">
      {companion.models.map((model, i) => {
        const placement = placements[model.id] ?? { x: 80 + i * 140, y: 80, ...DEFAULT_PLACEMENT };
        return (
          <CompanionModelHitArea
            key={model.id}
            model={model}
            companionScale={companion.scale ?? 1}
            placement={placement}
            onStartDrag={e => {
              e.stopPropagation();
              drag.current = { modelId: model.id, mode: e.ctrlKey || e.metaKey ? 'rotate' : 'move' };
            }}
            onScale={dScale => onScale(model.id, dScale)}
          />
        );
      })}
    </div>
  );
};
