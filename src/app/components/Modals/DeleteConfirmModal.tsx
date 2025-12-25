import s from './DeleteConfirmModal.module.css';
import React from 'react';
import { CustomModal } from './CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';

interface DeleteConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ show, onClose, onConfirm, title, message }) => {
  if (!show) {
    return null;
  }

  return (
    <CustomModal show={show} onClose={onClose} title={title}>
      <div className={s.container}>
        <p>{message}</p>
        <div className={s.buttons}>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={onConfirm} className={s.deleteButton}>Delete</PrimaryButton>
        </div>
      </div>
    </CustomModal>
  );
};
