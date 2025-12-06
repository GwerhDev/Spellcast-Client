import React from 'react';
import s from './VoiceSelectorModal.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faBrain, faCircle, faDesktop, faXmark } from '@fortawesome/free-solid-svg-icons';
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

  const defaultVoice: Voice = { label: 'Browser', value: 'browser', gender: 'Male' };

  return (
    <div className={s.container} onClick={onClose}>
      <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <IconButton className={s.closeButton} icon={faXmark} onClick={onClose} />

        <h3>Select a Voice</h3>
        <ul className={s.voiceList}>
          <li
            className={`${s.voiceOption} ${selectedVoice === defaultVoice.value ? s.activeVoice : ''}`}
            onClick={() => handleVoiceSelection(defaultVoice.value)}
          >
            <FontAwesomeIcon icon={selectedVoice === defaultVoice.value ? faCircle : faRegCircle} />
            <span>
              {defaultVoice.label}
            </span>
            <FontAwesomeIcon icon={faDesktop} className={s.genderIcon} />
          </li>
          {voices.map((voiceOption, index) => (
            <li
              key={index}
              className={`${s.voiceOption} ${selectedVoice === voiceOption.value ? s.activeVoice : ''}`}
              onClick={() => handleVoiceSelection(voiceOption.value)}
            >
              <FontAwesomeIcon icon={selectedVoice === voiceOption.value ? faCircle : faRegCircle} />
              <span>
                {voiceOption.label}
              </span>
              <FontAwesomeIcon icon={faBrain} className={s.genderIcon} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
