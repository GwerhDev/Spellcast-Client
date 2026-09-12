import React from 'react';
import { faImage, faClock } from '@fortawesome/free-solid-svg-icons';
import { GiftAnnouncementModal } from './GiftAnnouncementModal';
import { CoverFrameCorners } from '../CoverFrameCorners';
import { getCoverFrameStyle, getCoverFrameCorners } from '../../../utils/coverFrame';
import { useLanguage } from '../../../i18n';
import s from './CoverFrameGiftModal.module.css';

interface CoverFrameGiftModalProps {
  show: boolean;
  onSetDefault: () => void;
  onDismiss: () => void;
}

// TCORE-123: the Grimoire cover frame's own announcement, built on the shared
// GiftAnnouncementModal shell -- only this frame's own copy, confetti palette
// (bronze/gilded, matching the frame itself), and its `visual` (a real sample cover wearing
// the actual frame, rather than a generic icon -- an image announcement is exactly the case
// a static icon can't sell) are specific to it.
const CONFETTI_COLORS = ['#c9a24a', '#7a4d24', '#f0c988', '#8a5a2b', '#4a2e14'];
const FRAME_ID = 'grimoire';

export const CoverFrameGiftModal: React.FC<CoverFrameGiftModalProps> = ({ show, onSetDefault, onDismiss }) => {
  const { t } = useLanguage();
  const coverFrameStyle = getCoverFrameStyle(FRAME_ID);
  const coverFrameCorners = getCoverFrameCorners(FRAME_ID);

  return (
    <GiftAnnouncementModal
      show={show}
      title={t.coverFrameGift.title}
      body={t.coverFrameGift.body}
      visual={
        <div className={s.sampleCover} style={coverFrameStyle}>
          {coverFrameCorners && <CoverFrameCorners config={coverFrameCorners} />}
        </div>
      }
      primaryLabel={t.coverFrameGift.cta}
      primaryIcon={faImage}
      onPrimary={onSetDefault}
      secondaryLabel={t.coverFrameGift.dismiss}
      secondaryIcon={faClock}
      onSecondary={onDismiss}
      confettiColors={CONFETTI_COLORS}
    />
  );
};
