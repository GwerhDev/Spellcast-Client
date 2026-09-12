import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faClock, faGift } from '@fortawesome/free-solid-svg-icons';
import { CustomModal } from './CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { useLanguage } from '../../../i18n';
// TCORE-123: reuses CompanionGiftModal's own module -- nothing in it is companion-specific
// (icon cluster/confetti/actions row are all generic "gift announcement" styling), so a
// second copy would only drift from this one over time.
import s from './CompanionGiftModal.module.css';

interface CoverFrameGiftModalProps {
  show: boolean;
  onSetDefault: () => void;
  onDismiss: () => void;
}

const CONFETTI_COLORS = ['#c9a24a', '#7a4d24', '#f0c988', '#8a5a2b', '#4a2e14'];
const CONFETTI_COUNT = 22;

// Same one-shot burst as CompanionGiftModal's own Confetti (see that component for the
// full reasoning) -- just re-declared here with a bronze/gilded palette instead of the
// companion gift's blue/orange/purple mix, to match the Grimoire frame's own colors.
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

export const CoverFrameGiftModal: React.FC<CoverFrameGiftModalProps> = ({ show, onSetDefault, onDismiss }) => {
  const { t } = useLanguage();

  return (
    <CustomModal show={show} onClose={onDismiss} title={t.coverFrameGift.title} compact>
      <div className={s.content}>
        <div className={s.centered}>
          <div className={s.iconCluster}>
            {show && <Confetti />}
            <FontAwesomeIcon icon={faGift} className={`${s.decorGift} ${s.decorGiftLeft}`} />
            <FontAwesomeIcon icon={faGift} className={`${s.decorGift} ${s.decorGiftRight}`} />
            <div className={s.iconWrap}>
              <FontAwesomeIcon icon={faImage} className={s.icon} />
            </div>
          </div>
          <p className={s.body}>{t.coverFrameGift.body}</p>
        </div>
        <div className={s.actions}>
          <PrimaryButton icon={faImage} onClick={onSetDefault}>{t.coverFrameGift.cta}</PrimaryButton>
          <SecondaryButton icon={faClock} onClick={onDismiss} className={s.dismissButton}>{t.coverFrameGift.dismiss}</SecondaryButton>
        </div>
      </div>
    </CustomModal>
  );
};
