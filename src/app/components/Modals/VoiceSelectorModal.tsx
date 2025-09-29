import React from 'react';
import s from './VoiceSelectorModal.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faCircle, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faCircle as faRegCircle } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Voice } from 'src/interfaces';

interface VoiceSelectorModalProps {
  voices: Voice[];
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  onClose: () => void;
  show: boolean;
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  voices,
  selectedVoice,
  setSelectedVoice,
  onClose,
  show,
}) => {
  if (!show) {
    return null;
  }

  const handleVoiceSelection = (voice: string) => {
    setSelectedVoice(voice);
  };

  return (
    <div className={s.container} onClick={onClose}>
      <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <IconButton className={s.closeButton} icon={faXmark} onClick={onClose} />

        <h3>Select a Voice</h3>
        <ul className={s.voiceList}>
          {voices.map((voiceOption, index) => (
            <li
              key={index}
              className={`${s.voiceOption} ${selectedVoice === voiceOption.value ? s.activeVoice : ''}`}
              onClick={() => handleVoiceSelection(voiceOption.value)}
            >
              <FontAwesomeIcon icon={selectedVoice === voiceOption.value ? faCircle : faRegCircle} />
              {voiceOption.value}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
