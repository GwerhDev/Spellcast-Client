import React from 'react';
import { Canvas } from '@react-three/fiber';
import { CoverFrame3DScene } from './CoverFrame3DScene';
import type { CoverFrame3DConfig } from '../../../utils/coverFrame';

interface CoverFrame3DCanvasProps {
  config: CoverFrame3DConfig;
  coverUrl: string;
  // The cover's own corner radius, as in CoverFrame3DView.
  radius: number;
  className?: string;
}

// One cover object in a canvas of its own, part of the page where it sits: unlike a <View>
// drawn into the app's shared canvas (CoverFrame3DRoot, behind every modal and over every
// card), it's layered, filtered, faded and moved along with whatever holds it -- a card in a
// coverflow (dimmed, overlapping, sliding), or a modal. Each one is a WebGL context of its
// own, which browsers cap (~8-16), so it's for the few covers shown that way at once, not a
// grid of them (those share the root canvas). It draws only when something changes: its
// size, or its contents loading.
export const CoverFrame3DCanvas: React.FC<CoverFrame3DCanvasProps> = ({ config, coverUrl, radius, className }) => (
  <Canvas
    className={className}
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    frameloop="demand"
    // Its layout size, not its size on screen: a coverflow scales the card holding it (and
    // springs it from one scale to the next), which already scales the canvas along with
    // it -- measured on screen, it would be drawn smaller, then scaled down again.
    resize={{ offsetSize: true }}
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
  >
    <CoverFrame3DScene config={config} coverUrl={coverUrl} radius={radius} />
  </Canvas>
);
