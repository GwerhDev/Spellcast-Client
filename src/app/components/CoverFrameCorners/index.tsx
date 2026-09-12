import React from 'react';
import type { CoverFrameCornersConfig } from '../../../utils/coverFrame';

// TCORE-123 follow-up: the "9-slice"-style corner-plate mechanism for a 'cornered'
// CoverFrame (see that field's own comment in config/assets/types.ts for why this
// replaced a single frame image stretched to the cover's own box). Each corner image is
// rendered at a FIXED pixel size, mirrored via CSS transform for the other 3 -- never
// scaled to the cover's aspect ratio, so a corner plate's rivets and curves stay round
// regardless of whether the cover box is a 160x180 SpellCard, an 80x110 SpellDetail image,
// or a 36x36 square player thumbnail. The straight edge banding between corners is a plain
// CSS border (see getCoverFrameStyle) applied directly to the cover <img> itself -- borders
// are the one part of this design that scales to any aspect ratio without distortion, so it
// isn't reproduced here.
//
// Each piece is centered ON the cover's own edge/corner (via a translate, like a picture
// frame's own physical lip) rather than flush inside it -- half of it overhangs past the
// cover, which is the "gilded plate/clasp bolted onto the book" look this was asked for.
// The parent element (the cover's own wrapper, or a same-size slot positioned over it, see
// SpellCard's own .coverFrameSlot) must NOT clip overflow, or that overhanging half gets cut
// off -- this is exactly what broke it before .coverFrameSlot existed.
const CORNER_SIZE = 28;
const CORNER_OVERHANG = 2;
const MEDALLION_WIDTH = 22;
const MEDALLION_HEIGHT = 18;

interface CoverFrameCornersProps {
  config: CoverFrameCornersConfig;
  // Optional extra class on each piece -- e.g. SpellCard's own dim-on-hover transition, so
  // the frame fades together with the rest of the cover under its hover scrim instead of
  // either staying crisp above it or popping fully opaque/hidden with no transition of its
  // own.
  className?: string;
}

export const CoverFrameCorners: React.FC<CoverFrameCornersProps> = ({ config, className }) => {
  const { cornerImageUrl, medallionImageUrl } = config;
  const cornerStyle: React.CSSProperties = {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    pointerEvents: 'none',
  };

  return (
    <>
      <img src={cornerImageUrl} alt="" aria-hidden="true" data-testid="cover-frame-corner" className={className}
        style={{ ...cornerStyle, top: -CORNER_OVERHANG, left: -CORNER_OVERHANG }} />
      <img src={cornerImageUrl} alt="" aria-hidden="true" data-testid="cover-frame-corner" className={className}
        style={{ ...cornerStyle, top: -CORNER_OVERHANG, right: -CORNER_OVERHANG, transform: 'scaleX(-1)' }} />
      <img src={cornerImageUrl} alt="" aria-hidden="true" data-testid="cover-frame-corner" className={className}
        style={{ ...cornerStyle, bottom: -CORNER_OVERHANG, right: -CORNER_OVERHANG, transform: 'scale(-1, -1)' }} />
      <img src={cornerImageUrl} alt="" aria-hidden="true" data-testid="cover-frame-corner" className={className}
        style={{ ...cornerStyle, bottom: -CORNER_OVERHANG, left: -CORNER_OVERHANG, transform: 'scaleY(-1)' }} />
      {medallionImageUrl && (
        <>
          <img src={medallionImageUrl} alt="" aria-hidden="true" data-testid="cover-frame-medallion" className={className}
            style={{
              position: 'absolute', width: MEDALLION_WIDTH, height: MEDALLION_HEIGHT,
              top: 0, left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
            }} />
          <img src={medallionImageUrl} alt="" aria-hidden="true" data-testid="cover-frame-medallion" className={className}
            style={{
              position: 'absolute', width: MEDALLION_WIDTH, height: MEDALLION_HEIGHT,
              bottom: 0, left: '50%', transform: 'translate(-50%, 50%) scaleY(-1)', pointerEvents: 'none',
            }} />
        </>
      )}
    </>
  );
};
