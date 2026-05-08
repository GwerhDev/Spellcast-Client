import React from 'react';
import { CustomModal } from './CustomModal';
import { VoiceSelectorContent } from './VoiceSelectorContent';

interface VoiceSelectorModalProps {
  onClose: () => void;
  show: boolean;
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({ onClose, show }) => {
  if (!show) return null;
  return (
    <CustomModal title="Select a Voice" show={show} onClose={onClose}>
      <VoiceSelectorContent onClose={onClose} />
    </CustomModal>
  );
};
