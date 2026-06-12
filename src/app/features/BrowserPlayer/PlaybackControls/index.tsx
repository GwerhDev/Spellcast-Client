import s from '../../../components/Players/BrowserPlayer/PlaybackControls/PlaybackControls.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStepBackward, faStepForward } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { PlayButton } from '../../../components/PlayButton/PlayButton';

interface PlaybackControlsProps {
  handlePrevious: () => void;
  handleNext: () => void;
  disabled: boolean;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  handleTogglePlayPause: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  handlePrevious,
  handleNext,
  disabled,
  isPrevDisabled,
  isNextDisabled,
  handleTogglePlayPause,
}) => {
  const { isPlaying } = useSelector((state: RootState) => state.browserPlayer);

  return (
    <section className={s.controlsContainer}>
      <div className={s.controls}>
        <button onClick={handlePrevious} disabled={disabled || isPrevDisabled} className={s.controlButton}>
          <FontAwesomeIcon icon={faStepBackward} />
        </button>
        <PlayButton isPlaying={isPlaying} onClick={handleTogglePlayPause} disabled={disabled} />
        <button onClick={handleNext} disabled={disabled || isNextDisabled} className={s.controlButton}>
          <FontAwesomeIcon icon={faStepForward} />
        </button>
      </div>
    </section>
  );
};
