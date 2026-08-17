import s from './PlayerConfigButton.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSlidersH } from '@fortawesome/free-solid-svg-icons';

interface PlayerConfigButtonProps {
  onClick: () => void;
}

// Shared by both AudioPlayer and BrowserPlayer — the two were byte-identical copies before
// this consolidation (Phase 3a of the button-consistency plan).
export const PlayerConfigButton: React.FC<PlayerConfigButtonProps> = ({ onClick }) => {
  return (
    <div className={s.voiceSelectorContainer}>
      <button data-testid="player-config-button" className={s.voiceButton} onClick={onClick}>
        <FontAwesomeIcon icon={faSlidersH} />
      </button>
    </div>
  );
};
