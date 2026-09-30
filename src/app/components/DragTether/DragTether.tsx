import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDragPointer } from '../../../hooks/useDragPointer';
import s from './DragTether.module.css';

interface DragTetherProps {
  // Where the dragged item came from, in viewport coordinates.
  origin: { x: number; y: number };
}

// How far the thread sags under its own weight, as a share of its length, and its cap.
const SAG_RATIO = 0.22;
const MAX_SAG = 110;

// A glowing thread from where a dragged item left its place to the pointer, sagging like
// a real thread and flowing toward the pointer: the item is still tied to its origin until
// it's dropped. Drawn over the page (not inside the list, which scrolls and clips), and
// updated by writing to its SVG nodes directly, so moving never re-renders.
export const DragTether = ({ origin }: DragTetherProps) => {
  const threadRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);
  // Hidden until the pointer's first known position, so it never flashes a zero-length line.
  const [visible, setVisible] = useState(false);
  const gradientId = `drag-tether-${useId().replace(/:/g, '')}`;

  useDragPointer(true, (x, y) => {
    const dx = x - origin.x;
    const dy = y - origin.y;
    const sag = Math.min(Math.hypot(dx, dy) * SAG_RATIO, MAX_SAG);
    const d = `M ${origin.x} ${origin.y} Q ${origin.x + dx / 2} ${origin.y + dy / 2 + sag} ${x} ${y}`;
    threadRef.current?.setAttribute('d', d);
    glowRef.current?.setAttribute('d', d);
    tipRef.current?.setAttribute('cx', String(x));
    tipRef.current?.setAttribute('cy', String(y));
    gradientRef.current?.setAttribute('x2', String(x));
    gradientRef.current?.setAttribute('y2', String(y));
    if (!visible) setVisible(true);
  });

  return createPortal(
    <svg data-testid="drag-tether" className={`${s.tether} ${visible ? s.visible : ''}`} aria-hidden="true">
      <defs>
        <linearGradient
          ref={gradientRef}
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={origin.x}
          y1={origin.y}
          x2={origin.x}
          y2={origin.y}
        >
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path ref={glowRef} className={s.glow} stroke={`url(#${gradientId})`} />
      <path ref={threadRef} data-testid="drag-tether-thread" className={s.thread} stroke={`url(#${gradientId})`} />
      <circle className={s.anchor} cx={origin.x} cy={origin.y} r={5} />
      <circle ref={tipRef} className={s.tip} cx={origin.x} cy={origin.y} r={3.5} />
    </svg>,
    document.body,
  );
};
