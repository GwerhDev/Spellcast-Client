import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import s from './PlayButton.module.css';

interface PlayButtonProps {
  isPlaying: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const PlayButton: React.FC<PlayButtonProps> = ({ isPlaying, onClick, disabled, size = 'md' }) => (
  <button
    className={`${s.btn} ${s[size]} ${isPlaying ? s.playing : ''}`}
    onClick={onClick}
    disabled={disabled}
    style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
  >
    <span className={s.icon}>
      <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
    </span>
    <span className={s.sheen} aria-hidden="true" />
  </button>
);
