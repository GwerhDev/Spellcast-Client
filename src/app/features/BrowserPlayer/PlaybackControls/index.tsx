import s from '../../../components/Players/BrowserPlayer/PlaybackControls/PlaybackControls.module.css';
import React from 'react';
import { faStepBackward, faStepForward } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { PlayButton } from '../../../components/PlayButton/PlayButton';
import { IconButton } from '../../../components/Buttons/IconButton';

interface PlaybackControlsProps {
  handlePrevious: () => void;
  handleNext: () => void;
  disabled: boolean;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  handleTogglePlayPause: () => void;
  // Playback was requested but the voice hasn't actually started sounding yet.
  isStarting?: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  handlePrevious,
  handleNext,
  disabled,
  isPrevDisabled,
  isNextDisabled,
  handleTogglePlayPause,
  isStarting,
}) => {
  const { isPlaying } = useSelector((state: RootState) => state.browserPlayer);

  return (
    <section className={s.controlsContainer}>
      <div className={s.controls}>
        <IconButton
          data-testid="playback-previous-btn"
          icon={faStepBackward}
          onClick={handlePrevious}
          disabled={disabled || isPrevDisabled}
          className={s.controlButton}
        />
        {/* While the voice is starting, show where it's headed (pause); a click then cancels the start. */}
        <PlayButton isPlaying={isPlaying || !!isStarting} onClick={handleTogglePlayPause} disabled={disabled} />
        <IconButton
          data-testid="playback-next-btn"
          icon={faStepForward}
          onClick={handleNext}
          disabled={disabled || isNextDisabled}
          className={s.controlButton}
        />
      </div>
    </section>
  );
};
