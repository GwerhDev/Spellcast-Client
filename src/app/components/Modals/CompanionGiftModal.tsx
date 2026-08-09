import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCat, faClock } from '@fortawesome/free-solid-svg-icons';
import { CustomModal } from './CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { useLanguage } from '../../../i18n';
import s from './CompanionGiftModal.module.css';

interface CompanionGiftModalProps {
  show: boolean;
  onActivate: () => void;
  onDismiss: () => void;
}

export const CompanionGiftModal: React.FC<CompanionGiftModalProps> = ({ show, onActivate, onDismiss }) => {
  const { t } = useLanguage();

  return (
    <CustomModal show={show} onClose={onDismiss} title={t.companionGift.title} compact>
      <div className={s.content}>
        <div className={s.centered}>
          <div className={s.iconWrap}>
            <FontAwesomeIcon icon={faCat} className={s.icon} />
          </div>
          <p className={s.body}>{t.companionGift.body}</p>
        </div>
        {/* Same action-row pattern as DocumentDetailModal's .actions: PrimaryButton/
            SecondaryButton, both with icons, equal-width instead of right-aligned. */}
        <div className={s.actions}>
          <PrimaryButton icon={faCat} onClick={onActivate}>{t.companionGift.cta}</PrimaryButton>
          <SecondaryButton icon={faClock} onClick={onDismiss}>{t.companionGift.dismiss}</SecondaryButton>
        </div>
      </div>
    </CustomModal>
  );
};
