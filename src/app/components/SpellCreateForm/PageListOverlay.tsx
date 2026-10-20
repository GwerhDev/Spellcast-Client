import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import s from './PageListOverlay.module.css';

interface PageListOverlayProps {
  onClose: () => void;
  // Where it sits, when not the default (e.g. below a top bar floating over the page).
  className?: string;
  // The page list (see PageList), in one column.
  children: React.ReactNode;
}

interface PageListPlaceProps {
  // The top bar's toggle (see usePageListToggle).
  toggle: { narrow: boolean; open: boolean; setOpen: (open: boolean) => void };
  // The page list's own column beside the page, on a wide screen.
  className?: string;
  // The page list (see PageList) -- in one column when it's over the page.
  children: (overlay: boolean) => React.ReactNode;
}

const EASE = [0.22, 1, 0.36, 1] as const;

// Where the page list goes while it's shown: its column beside the page on a wide screen
// (taking that room), over the page on a phone. It comes in and goes out animated: the
// column opening and closing by its width (the page beside it following), the overlay
// sliding in and out along the right side.
export const PageListPlace: React.FC<PageListPlaceProps> = ({ toggle, className, children }) => {
  const reduced = useReducedMotion();
  const transition = reduced ? { duration: 0 } : { duration: 0.3, ease: EASE };
  return (
    <AnimatePresence initial={false}>
      {toggle.open && (toggle.narrow ? (
        <PageListOverlay key="overlay" onClose={() => toggle.setOpen(false)}>{children(true)}</PageListOverlay>
      ) : (
        <motion.div
          key="column"
          className={s.columnReveal}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'auto', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={transition}
        >
          <div className={className}>{children(false)}</div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

// The page list on a phone, opened from the top bar: over the page, along its right side.
// Picking a page closes it (deleting, resetting or adding one doesn't), and so does a tap
// anywhere outside it -- except on the top bar's own button, which closes it itself.
export const PageListOverlay: React.FC<PageListOverlayProps> = ({ onClose, className, children }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (rootRef.current?.contains(target) || target.closest('[data-page-list-toggle]')) return;
      onCloseRef.current();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  return (
    <motion.div
      ref={rootRef}
      data-testid="page-list-overlay"
      className={`${s.overlay} ${className ?? ''}`}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={reduced ? { duration: 0 } : { duration: 0.2, ease: EASE }}
      onClick={e => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-page-item]') && !target.closest('button')) onClose();
      }}
    >
      {children}
    </motion.div>
  );
};
