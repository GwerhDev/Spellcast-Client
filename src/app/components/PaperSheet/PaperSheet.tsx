import s from './PaperSheet.module.css';
import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { PageFrame } from '../../../utils/spellPage';

interface PaperSheetProps {
  // The page's size, margins and whether it's the cover (see pageFrame).
  frame: PageFrame;
  zoom: number;
  className?: string;
  // Extra styles on the sheet, e.g. the caster's page background (see usePageBackground).
  style?: CSSProperties;
  children: ReactNode;
}

// A spell page as a sheet of paper, the one the reader and the editor both draw: the page's
// size and margins, its zoom, and how its cover and PDF graphics sit on it -- so a page looks
// the same in either. Grows past its nominal height when its content is taller, so nothing
// is clipped at the bottom -- except a page drawn whole, which is exactly its PDF page.
export const PaperSheet = React.forwardRef<HTMLDivElement, PaperSheetProps>(({ frame, zoom, className, style, children }, ref) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);

  // offsetHeight is unscaled (transform-agnostic); ResizeObserver tracks reflow and typing.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const update = () => setSheetHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width, height, margins, cover, whole } = frame;
  return (
    <div className={s.zoomWrapper} style={{ width: `${width * zoom}px`, height: `${(whole ? height : Math.max(sheetHeight, height)) * zoom}px` }}>
      <div
        ref={(el) => {
          sheetRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        className={[s.sheet, cover ? s.coverPage : '', whole ? s.wholePage : '', className ?? ''].filter(Boolean).join(' ')}
        data-cover-page={cover || undefined}
        style={{
          ...style,
          width: `${width}px`,
          height: whole ? `${height}px` : undefined,
          minHeight: whole ? undefined : `${height}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          paddingTop: margins.marginTop,
          paddingRight: margins.marginRight,
          paddingBottom: margins.marginBottom,
          paddingLeft: margins.marginLeft,
          '--margin-top': `${margins.marginTop}px`,
          '--margin-right': `${margins.marginRight}px`,
          '--margin-bottom': `${margins.marginBottom}px`,
          '--margin-left': `${margins.marginLeft}px`,
          '--paper-height': `${height}px`,
        } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
});

PaperSheet.displayName = 'PaperSheet';
