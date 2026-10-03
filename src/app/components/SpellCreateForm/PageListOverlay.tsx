import React, { useEffect, useRef } from 'react';
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

// Where the page list goes while it's shown: its column beside the page on a wide screen
// (taking that room), over the page on a phone.
export const PageListPlace: React.FC<PageListPlaceProps> = ({ toggle, className, children }) => {
  if (!toggle.open) return null;
  if (toggle.narrow) return <PageListOverlay onClose={() => toggle.setOpen(false)}>{children(true)}</PageListOverlay>;
  return <div className={className}>{children(false)}</div>;
};

// The page list on a phone, opened from the top bar: over the page, along its right side.
// Picking a page closes it (deleting, resetting or adding one doesn't), and so does a tap
// anywhere outside it -- except on the top bar's own button, which closes it itself.
export const PageListOverlay: React.FC<PageListOverlayProps> = ({ onClose, className, children }) => {
  const rootRef = useRef<HTMLDivElement>(null);
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
    <div
      ref={rootRef}
      data-testid="page-list-overlay"
      className={`${s.overlay} ${className ?? ''}`}
      onClick={e => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-page-item]') && !target.closest('button')) onClose();
      }}
    >
      {children}
    </div>
  );
};
