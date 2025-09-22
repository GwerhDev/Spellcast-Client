import React from 'react';
import s from './VoiceCheckboxModal.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { Voice } from 'src/interfaces';

interface VoiceCheckboxModalProps {
  voices: Voice[];
  selectedVoices: string[];
  onVoiceChange: (voiceId: string) => void;
  onClose: () => void;
  show: boolean;
}

export const VoiceCheckboxModal: React.FC<VoiceCheckboxModalProps> = ({
  voices,
  selectedVoices,
  onVoiceChange,
  onClose,
  show,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className={s.container} onClick={onClose}>
      <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <IconButton className={s.closeButton} icon={faXmark} onClick={onClose} />

        <h3>Select Voices</h3>
        <ul className={s.voiceList}>
          {voices.map((voice) => (
            <li key={voice.value} className={s.voiceOption} onClick={() => onVoiceChange(voice.value)}>
              <input
                type="checkbox"
                id={voice.value}
                checked={selectedVoices.includes(voice.value)}
                onChange={() => {}}
              />
              <p>{voice.name}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
