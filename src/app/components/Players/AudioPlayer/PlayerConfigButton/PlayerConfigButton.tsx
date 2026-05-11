import s from './VoiceSelectorButton.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';

interface PlayerConfigButtonProps {
  onClick: () => void;
}

export const PlayerConfigButton: React.FC<PlayerConfigButtonProps> = ({ onClick }) => {
  return (
    <div className={s.voiceSelectorContainer}>
      <button className={s.voiceButton} onClick={onClick}>
        <FontAwesomeIcon icon={faGear} />
      </button>
    </div>
  );
};
