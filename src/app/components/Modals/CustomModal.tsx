import React from 'react';
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

export const CustomModal: React.FC<ModalProps> = ({ show, onClose, title, children, compact, motion }) => {
  if (!show) {
    return null;
  }

  // Portaled to <body> so the overlay always covers the whole screen: opened from inside
  // another modal, its box (backdrop-filter) would otherwise become the containing block for
  // this `position: fixed` overlay and squeeze it into that box.
  return createPortal(
    <div className={`${s.overlay} ${motion === 'enter' ? s.overlayEnter : motion === 'leave' ? s.overlayLeave : ''}`} onClick={onClose}>
      <div className={`${s.container} ${compact ? s.compact : ''} ${motion === 'enter' ? s.enter : motion === 'leave' ? s.leave : ''}`}>
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
