import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import s from './PlayButton.module.css';

interface PlayButtonProps {
  isPlaying: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  // Turns on the playing glow/animation without swapping the icon (e.g. a drop target
  // reacting to something dragged over it).
  active?: boolean;
  // Replaces the play/pause icon (e.g. a brand mark while there's nothing to play yet).
  icon?: React.ReactNode;
  // Nothing to do on click yet: shown as-is (not dimmed like `disabled`), with a plain
  // cursor and no hover glow/sheen inviting a click.
  idle?: boolean;
}

export const PlayButton: React.FC<PlayButtonProps> = ({ isPlaying, onClick, disabled, size = 'md', active, icon, idle }) => (
  <button
    data-testid="play-button"
    className={`${s.btn} ${s[size]} ${isPlaying || active ? s.playing : ''} ${idle ? s.idle : ''}`}
    onClick={idle ? undefined : onClick}
    aria-disabled={idle || undefined}
    disabled={disabled}
    style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
  >
    <span className={s.icon}>
      {icon ?? <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />}
    </span>
    <span className={s.sheen} aria-hidden="true" />
  </button>
);
