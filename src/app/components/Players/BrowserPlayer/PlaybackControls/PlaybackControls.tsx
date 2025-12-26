import s from './PlaybackControls.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStepBackward, faStepForward } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { pause, play } from 'store/browserPlayerSlice';
import { RootState } from 'store/index';

interface PlaybackControlsProps {
  handlePrevious: () => void;
  handleNext: () => void;
  disabled: boolean;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  handlePrevious,
  handleNext,
  disabled,
  isPrevDisabled,
  isNextDisabled,
}) => {
  const dispatch = useDispatch();
  const { isPlaying } = useSelector((state: RootState) => state.browserPlayer);

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      dispatch(pause());
      return;
    };
    window.speechSynthesis.resume();
    dispatch(play());
    return;
  };

  return (
    <section className={s.controlsContainer}>
      <div className={s.controls}>
        <button onClick={handlePrevious} disabled={disabled || isPrevDisabled} className={s.controlButton}>
          <FontAwesomeIcon icon={faStepBackward} />
        </button>
        <button disabled={disabled} onClick={handleTogglePlayPause} className={s.playPauseButton}>
          <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
        </button>
        <button onClick={handleNext} disabled={disabled || isNextDisabled} className={s.controlButton}>
          <FontAwesomeIcon icon={faStepForward} />
        </button>
      </div>
    </section>
  );
};
