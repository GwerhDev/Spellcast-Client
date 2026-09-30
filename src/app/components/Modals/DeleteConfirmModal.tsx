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
  // Confirm button label for destructive actions that aren't a deletion (e.g. a reset);
  // defaults to "Delete".
  confirmText?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ show, onClose, onConfirm, title, message, confirmText }) => {
  const { t } = useLanguage();
  if (!show) {
    return null;
  }

  return (
    <CustomModal compact show={show} onClose={onClose} title={title}>
      <div className={s.container}>
        <p>{message}</p>
        <div className={s.buttons}>
          <SecondaryButton data-testid="delete-confirm-cancel-btn" onClick={onClose}>{t.common.cancel}</SecondaryButton>
          <PrimaryButton data-testid="delete-confirm-confirm-btn" onClick={onConfirm} variant="danger">{confirmText ?? t.common.delete}</PrimaryButton>
        </div>
      </div>
    </CustomModal>
  );
};
