import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStepBackward, faStepForward } from '@fortawesome/free-solid-svg-icons';
import s from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  handlePrevious: () => void;
  handleNext: () => void;
  isPlaying: boolean;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  togglePlayPause: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  handlePrevious,
  handleNext,
  isPlaying,
  isPrevDisabled,
  isNextDisabled,
  togglePlayPause,
}) => {
  return (
    <section className={s.controlsContainer}>
      <div className={s.controls}>
        <button onClick={handlePrevious} disabled={isPrevDisabled} className={s.controlButton}>
          <FontAwesomeIcon icon={faStepBackward} />
        </button>
        <button onClick={togglePlayPause} className={s.playPauseButton}>
          <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
        </button>
        <button onClick={handleNext} disabled={isNextDisabled} className={s.controlButton}>
          <FontAwesomeIcon icon={faStepForward} />
        </button>
      </div>
    </section>
  );
};
