import React from 'react';
import { CustomModal } from './CustomModal';
import { VoiceSelectorContent } from './VoiceSelectorContent';
import { useLanguage } from '../../../i18n';

interface VoiceSelectorModalProps {
  onClose: () => void;
  show: boolean;
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({ onClose, show }) => {
  const { t } = useLanguage();
  if (!show) return null;
  return (
    <CustomModal title={t.player.selectVoice} show={show} onClose={onClose}>
      <VoiceSelectorContent onClose={onClose} />
    </CustomModal>
  );
};
