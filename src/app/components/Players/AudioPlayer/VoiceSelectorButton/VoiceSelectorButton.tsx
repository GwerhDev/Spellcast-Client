
import s from './VoiceSelectorButton.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';

interface VoiceSelectorButtonProps {
  onClick: () => void;
}

export const VoiceSelectorButton: React.FC<VoiceSelectorButtonProps> = ({ onClick }) => {
  return (
    <div className={s.voiceSelectorContainer}>
      <button
        className={s.voiceButton}
        onClick={onClick}
      >
        <FontAwesomeIcon icon={faGear} />
      </button>
    </div>
  );
};
