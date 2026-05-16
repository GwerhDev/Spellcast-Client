import s from './DeleteConfirmModal.module.css';
import React from 'react';
import { CustomModal } from './CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { useLanguage } from '../../../i18n';

interface DeleteConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ show, onClose, onConfirm, title, message }) => {
  const { t } = useLanguage();
  if (!show) {
    return null;
  }

  return (
    <CustomModal show={show} onClose={onClose} title={title}>
      <div className={s.container}>
        <p>{message}</p>
        <div className={s.buttons}>
          <SecondaryButton onClick={onClose}>{t.common.cancel}</SecondaryButton>
          <PrimaryButton onClick={onConfirm} className={s.deleteButton}>{t.common.delete}</PrimaryButton>
        </div>
      </div>
    </CustomModal>
  );
};
