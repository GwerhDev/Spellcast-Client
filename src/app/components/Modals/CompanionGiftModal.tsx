import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCat, faClock, faGift } from '@fortawesome/free-solid-svg-icons';
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

const CONFETTI_COLORS = ['#73a5cc', '#e0863c', '#f5b342', '#4caf7d', '#c778dd'];
const CONFETTI_COUNT = 22;

// One-shot burst from the icon cluster's center, played once on mount (initial->animate,
// no repeat) — small colored pieces fly outward/down with random rotation and fade out.
// Pure framer-motion (already a dependency elsewhere in the app), no confetti library.
const Confetti: React.FC = () => (
  <div className={s.confettiLayer} aria-hidden="true">
    {Array.from({ length: CONFETTI_COUNT }, (_, i) => {
      const angle = (i / CONFETTI_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const distance = 70 + Math.random() * 70;
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const isSquare = i % 2 === 0;
      return (
        <motion.span
          key={i}
          className={isSquare ? s.confettiSquare : s.confettiDot}
          style={{ background: color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance + 30,
            opacity: 0,
            rotate: (Math.random() - 0.5) * 360,
          }}
          transition={{ duration: 1 + Math.random() * 0.7, ease: 'easeOut', delay: Math.random() * 0.2 }}
        />
      );
    })}
  </div>
);

export const CompanionGiftModal: React.FC<CompanionGiftModalProps> = ({ show, onActivate, onDismiss }) => {
  const { t } = useLanguage();

  return (
    <CustomModal show={show} onClose={onDismiss} title={t.companionGift.title} compact>
      <div className={s.content}>
        <div className={s.centered}>
          <div className={s.iconCluster}>
            {show && <Confetti />}
            <FontAwesomeIcon icon={faGift} className={`${s.decorGift} ${s.decorGiftLeft}`} />
            <FontAwesomeIcon icon={faGift} className={`${s.decorGift} ${s.decorGiftRight}`} />
            <div className={s.iconWrap}>
              <FontAwesomeIcon icon={faCat} className={s.icon} />
            </div>
          </div>
          <p className={s.body}>{t.companionGift.body}</p>
        </div>
        {/* Same action-row pattern as DocumentDetailModal's .actions: PrimaryButton/
            SecondaryButton, both with icons, equal-width instead of right-aligned. */}
        <div className={s.actions}>
          <PrimaryButton icon={faCat} onClick={onActivate}>{t.companionGift.cta}</PrimaryButton>
          <SecondaryButton icon={faClock} onClick={onDismiss} className={s.dismissButton}>{t.companionGift.dismiss}</SecondaryButton>
        </div>
      </div>
    </CustomModal>
  );
};
