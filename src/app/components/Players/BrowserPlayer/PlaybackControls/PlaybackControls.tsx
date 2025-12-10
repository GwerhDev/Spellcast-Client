import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStepBackward, faStepForward } from '@fortawesome/free-solid-svg-icons';
import s from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  selectedVoice: string;
  currentTime: number;
  duration: number;
  progressPercentage: number;
  handlePrevious: () => void;
  handleNext: () => void;
  isPlaying: boolean;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  currentTrackIndex: number | null;
  formatTime: (time: number) => string;
  togglePlayPause: () => void;
  setCurrentTime: (time: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  handlePrevious,
  handleNext,
  isPlaying,
  isPrevDisabled,
  isNextDisabled,
  currentTrackIndex,
  togglePlayPause,
}) => {
  return (
    <section className={s.controlsContainer}>
      <div className={s.controls}>
        <button onClick={handlePrevious} disabled={isPrevDisabled} className={s.controlButton}>
          <FontAwesomeIcon icon={faStepBackward} />
        </button>
        <button onClick={togglePlayPause} disabled={currentTrackIndex === null} className={s.playPauseButton} style={currentTrackIndex === null ? { opacity: '0.5', cursor: 'not-allowed' } : {}}>
          <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
        </button>
        <button onClick={handleNext} disabled={isNextDisabled} className={s.controlButton}>
          <FontAwesomeIcon icon={faStepForward} />
        </button>
      </div>
    </section>
  );
};
