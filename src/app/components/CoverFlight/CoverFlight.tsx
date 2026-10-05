import React, { useCallback, useRef, useState } from 'react';
import spellcastLogo from '../../../assets/spellcast-logo.svg';
import { getCoverFrame3D, getCoverFrameCorners, getCoverFrameStyle } from '../../../utils/coverFrame';
import { VIEW_MARGIN_X, VIEW_MARGIN_Y } from '../Cover3D/constants';
import { CoverFrameCorners } from '../CoverFrameCorners';
import { Flight, type FlightProps } from '../Flight/Flight';
import s from './CoverFlight.module.css';
import { LazyCoverFrame3DCanvas } from '../Cover3D/lazyCover3D';

export type { FlightRect } from '../Flight/flightRect';

interface CoverFlightProps extends Omit<FlightProps, 'children' | 'back' | 'radius' | 'faceClassName' | 'testId'> {
  src: string;
  // The cover's frame (already resolved: the spell's own pick or the default), flying with
  // it -- the same border and corner pieces the card and the modal show. None: bare cover.
  frameId?: string | null;
  // 3D covers are on (see useCoverFrame3DEnabled): a frame with 3D pieces flies as the
  // same 3D object the card and the modal show, not as its flat version.
  show3D?: boolean;
}

// Quoted: Vite inlines small SVGs as data URIs containing single quotes, which an unquoted
// url() rejects.
const brandMask = `url("${spellcastLogo}")`;

// A spell's cover in flight: the cover in its frame in front, the app's mark on its back
// (seen when it turns).
export const CoverFlight = ({ src, frameId = null, show3D = false, ...flight }: CoverFlightProps) => {
  const frameStyle = getCoverFrameStyle(frameId);
  const frameCorners = getCoverFrameCorners(frameId);
  const frame3D = show3D ? getCoverFrame3D(frameId) : null;
  // The 3D cover's canvas isn't resized along with the flying box -- resizing a canvas
  // clears it, and it would show nothing until it's drawn again, every frame of the flight.
  // It keeps the size the cover lands at and is scaled to the box instead, as it changes.
  const [landing] = useState(() => (frame3D ? flight.target() ?? flight.from : flight.from));
  const slot3DRef = useRef<HTMLDivElement>(null);
  const followBox = useCallback((width: number, height: number) => {
    const slot = slot3DRef.current;
    if (slot) slot.style.transform = `scale(${width / landing.width}, ${height / landing.height})`;
  }, [landing]);

  return (
    <Flight
      {...flight}
      onBoxSize={frame3D ? followBox : undefined}
      testId="cover-flight"
      // A frame's corner plates are square hardware: a framed cover has square corners, as
      // on the card -- on both faces, so its back doesn't turn up rounder than its front.
      radius={frameCorners ? '0' : '.2rem'}
      faceClassName={frameCorners ? s.framed : ''}
      back={(
        <div className={s.back}>
          <span className={s.mark} style={{ maskImage: brandMask, WebkitMaskImage: brandMask }} />
        </div>
      )}
    >
      {/* One face, so the frame turns with the cover and hides with it while the back shows. */}
      <img src={src} alt="" className={s.frontImage} style={frameStyle} />
      {frame3D ? (
        // The 3D cover over the flat one (which shows until it has loaded), with room around
        // it for the frame's overhang, scaled to the flying box (see followBox).
        <div
          ref={slot3DRef}
          data-testid="cover-flight-3d"
          className={s.frame3D}
          style={{
            '--cover-frame-3d-margin-x': `${VIEW_MARGIN_X}px`,
            '--cover-frame-3d-margin-y': `${VIEW_MARGIN_Y}px`,
            width: landing.width + 2 * VIEW_MARGIN_X,
            height: landing.height + 2 * VIEW_MARGIN_Y,
            transform: `scale(${flight.from.width / landing.width}, ${flight.from.height / landing.height})`,
          } as React.CSSProperties}
        >
          <React.Suspense fallback={null}>
            <LazyCoverFrame3DCanvas config={frame3D} coverUrl={src} radius={0} />
          </React.Suspense>
        </div>
      ) : frameCorners && <CoverFrameCorners config={frameCorners} />}
    </Flight>
  );
};
