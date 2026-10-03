import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import s from './CustomModal.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
  // Opt-in entrance/exit: 'enter' fades in as it opens, 'leave' fades back out (the
  // owner closes it once that's done, e.g. after a cover flies back to its card).
  motion?: 'enter' | 'leave';
}

// The modals open right now, the last one on top: Escape closes that one only (a
// confirmation over a spell's detail closes, the detail stays). One listener for all of
// them, in the capture phase, so a page's own Escape (e.g. letting go of a selection)
// doesn't also act while a modal has it.
const openModals: { close: () => void }[] = [];
const handleEscape = (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || openModals.length === 0) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  openModals[openModals.length - 1].close();
};

export const CustomModal: React.FC<ModalProps> = ({ show, onClose, title, children, compact, motion }) => {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => {
    if (!show) return;
    const entry = { close: () => onCloseRef.current() };
    if (openModals.length === 0) window.addEventListener('keydown', handleEscape, true);
    openModals.push(entry);
    return () => {
      openModals.splice(openModals.indexOf(entry), 1);
      if (openModals.length === 0) window.removeEventListener('keydown', handleEscape, true);
    };
  }, [show]);

  if (!show) {
    return null;
  }

  // Portaled to <body> so the overlay always covers the whole screen: opened from inside
  // another modal, its box (backdrop-filter) would otherwise become the containing block for
  // this `position: fixed` overlay and squeeze it into that box.
  return createPortal(
    <div className={`${s.overlay} ${motion === 'enter' ? s.overlayEnter : motion === 'leave' ? s.overlayLeave : ''}`} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title || undefined} className={`${s.container} ${compact ? s.compact : ''} ${motion === 'enter' ? s.enter : motion === 'leave' ? s.leave : ''}`}>
        <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
          <span className={s.closeButtonContainer}>
            <IconButton data-testid="custom-modal-close" className={s.closeButton} icon={faXmark} onClick={onClose} />
          </span>
          <h3>{title}</h3>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};
