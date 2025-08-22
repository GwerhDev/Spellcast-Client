import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStepBackward, faStepForward } from '@fortawesome/free-solid-svg-icons';
import s from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
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
  audioRef,
  currentTime,
  duration,
  progressPercentage,
  handlePrevious,
  handleNext,
  isPlaying,
  isPrevDisabled,
  isNextDisabled,
  currentTrackIndex,
  formatTime,
  togglePlayPause,
  setCurrentTime,
}) => {
  return (
    <section className={s.controlsContainer}>
      <div className={s.progressBarContainer}>
        <input
          type="range"
          min="0"
          max={duration}
          step="0.01"
          value={currentTime}
          onChange={(e) => {
            if (audioRef.current) {
              audioRef.current.currentTime = parseFloat(e.target.value);
            }
            setCurrentTime(parseFloat(e.target.value));
          }}
          className={s.progressBar}
          style={{ '--progress-value': `${progressPercentage}%` } as React.CSSProperties}
        />
        <div className={s.timeDisplay}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
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
