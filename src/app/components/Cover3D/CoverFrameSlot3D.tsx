import React, { Suspense, useEffect, useRef, useState } from 'react';
import type { CoverFrame3DConfig } from '../../../utils/coverFrame';

// TCORE-124: three/@react-three/fiber/@react-three/drei are only downloaded once a card
// actually renders this component (i.e. show3D is true for it) -- lazy so SpellCard, used
// on nearly every route, doesn't statically pull the whole 3D stack into the main bundle
// for every session regardless of whether Mode3D is even on. Confirmed the hard way: a
// non-lazy import here inflated the main chunk by ~900kB even though CoverFrame3DRoot
// itself (DefaultLayout's own import) was already lazy -- SpellCard is what actually
// touches nearly every route, so IT is the import that has to be the lazy boundary.
const CoverFrame3DView = React.lazy(() =>
  import('./CoverFrame3DView').then(m => ({ default: m.CoverFrame3DView }))
);

// TCORE-124: the tracked DOM element <View> needs to mirror the 3D corners onto a card's
// own cover box. A plain, in-flow <div> sized/positioned exactly like SpellCard's own
// .coverFrameOverlay pieces would be -- <View> reads THIS element's getBoundingClientRect()
// every render frame (inside r3f's own render loop, see CoverFrame3DRoot's comment) and
// scissor-draws the shared canvas into that exact screen rectangle, so as long as this div
// sits in the right place, the 3D corners can never visibly lag behind it -- they're derived
// from its own real, current position on every single frame, not synced after the fact.
//
// Rendered by SpellCard in place of CoverFrameCorners when 3D is active for this card (see
// SpellCard's own `show3D` prop) -- same position in the DOM tree as the old .coverFrameSlot
// (a sibling of .cardClip, so it can overhang the card's own rounded corners), same size as
// the cover box it sits over.
interface CoverFrameSlot3DProps {
  config: CoverFrame3DConfig;
  className?: string;
}

export const CoverFrameSlot3D: React.FC<CoverFrameSlot3DProps> = ({ config, className }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={trackRef} className={className} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* size is only known once this div has actually been laid out -- CoverFrame3DView's
          own orthographic camera needs real px dimensions to match the corner math exactly
          (see CORNER_SIZE/CORNER_OVERHANG there), so nothing renders into the tracked view
          until that first measurement lands. */}
      {size && (
        <Suspense fallback={null}>
          <CoverFrame3DView config={config} width={size.width} height={size.height} trackRef={trackRef} />
        </Suspense>
      )}
    </div>
  );
};
