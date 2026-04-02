import React from 'react';
import s from './CustomModal.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const CustomModal: React.FC<ModalProps> = ({ show, onClose, title, children }) => {
  if (!show) {
    return null;
  }

  return (
    <div className={s.container} onClick={onClose}>
      <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <span className={s.closeButton}>
          <IconButton className={s.closeButton} icon={faXmark} onClick={onClose} />
        </span>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
};
