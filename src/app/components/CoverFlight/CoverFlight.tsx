import spellcastLogo from '../../../assets/spellcast-logo.svg';
import { getCoverFrameCorners, getCoverFrameStyle } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../CoverFrameCorners';
import { Flight, type FlightProps } from '../Flight/Flight';
import s from './CoverFlight.module.css';

export type { FlightRect } from '../Flight/flightRect';

interface CoverFlightProps extends Omit<FlightProps, 'children' | 'back' | 'radius' | 'faceClassName' | 'testId'> {
  src: string;
  // The cover's frame (already resolved: the spell's own pick or the default), flying with
  // it -- the same border and corner pieces the card and the modal show. None: bare cover.
  frameId?: string | null;
}

// Quoted: Vite inlines small SVGs as data URIs containing single quotes, which an unquoted
// url() rejects.
const brandMask = `url("${spellcastLogo}")`;

// A spell's cover in flight: the cover in its frame in front, the app's mark on its back
// (seen when it turns).
export const CoverFlight = ({ src, frameId = null, ...flight }: CoverFlightProps) => {
  const frameStyle = getCoverFrameStyle(frameId);
  const frameCorners = getCoverFrameCorners(frameId);

  return (
    <Flight
      {...flight}
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
      {frameCorners && <CoverFrameCorners config={frameCorners} />}
    </Flight>
  );
};
