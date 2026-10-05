import React, { useId, useLayoutEffect, useRef } from 'react';
import { removePageBook, setPageBook } from './pageBooks';
import type { CoverFrame3DConfig } from '../../../utils/coverFrame';

interface CoverFrame3DViewProps {
  config: CoverFrame3DConfig;
  // The cover's own blob URL.
  coverUrl: string;
  // The cover's corner radius (px), as the card's own.
  radius: number;
  className?: string;
}

// A card's cover in the page's 3D scene (see CoverFrame3DRoot): this element marks where
// it is -- the cover's box with VIEW_MARGIN_X/Y of room around it (see constants.ts), as the
// caller's .coverFrameSlot sizes it -- and the scene draws the cover there as a book, as the
// element is: moved, turned, scaled and faded with it. Used by SpellCard, EditorPickerCard
// and SpellDetail in place of the flat cover and its frame while 3D covers are on (each
// one's `show3D`).
export const CoverFrame3DView: React.FC<CoverFrame3DViewProps> = ({ config, coverUrl, radius, className }) => {
  const id = useId();
  const elementRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (elementRef.current) setPageBook(id, { element: elementRef.current, config, coverUrl, radius });
  }, [id, config, coverUrl, radius]);
  useLayoutEffect(() => () => removePageBook(id), [id]);
  return <div ref={elementRef} className={className} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true" />;
};
