import React from 'react';
import { Canvas } from '@react-three/fiber';
import type { Companion } from '../../../config/assets';
import { CatModel } from './CatModel';
import s from './CompanionOverlay.module.css';

interface Props {
  companion: Companion;
}

// Presentational only (Layer 4) — receives the resolved companion by props, no Redux.
// pointer-events: none on the root so the transparent r3f canvas never intercepts reader
// clicks/scroll; the cats are purely ambient.
export const CompanionOverlay: React.FC<Props> = ({ companion }) => (
  <div className={s.overlay} data-testid="companion-overlay">
    <Canvas
      className={s.canvas}
      gl={{ alpha: true }}
      camera={{ position: [0, 3, 4], fov: 40 }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 2]} intensity={0.6} />
      {companion.models.map((model, i) => (
        <CatModel
          key={model.id}
          color={model.color}
          scale={companion.scale}
          speed={companion.speed}
          phaseOffset={i}
        />
      ))}
    </Canvas>
  </div>
);
