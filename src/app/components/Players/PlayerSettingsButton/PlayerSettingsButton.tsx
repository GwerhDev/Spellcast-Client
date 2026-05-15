import s from './PlayerSettingsButton.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSlidersH } from '@fortawesome/free-solid-svg-icons';

interface PlayerSettingsButtonProps {
  onClick: () => void;
}

export const PlayerSettingsButton: React.FC<PlayerSettingsButtonProps> = ({ onClick }) => {
  return (
    <div className={s.container}>
      <button className={s.button} onClick={onClick}>
        <FontAwesomeIcon icon={faSlidersH} />
      </button>
    </div>
  );
};
