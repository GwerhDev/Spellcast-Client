import s from './VolumeControls.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';

interface VolumeControlsProps {
  volume: number;
  volumePercentage: number;
  showVolumeSlider: boolean;
  setShowVolumeSlider: (show: boolean) => void;
  volumeSliderRef: React.RefObject<HTMLDivElement | null>;
  volumeButtonRef: React.RefObject<HTMLButtonElement | null>;
  setVolume: (volume: number) => void;
}

export const VolumeControls: React.FC<VolumeControlsProps> = ({
  volume,
  volumePercentage,
  showVolumeSlider,
  setShowVolumeSlider,
  volumeSliderRef,
  volumeButtonRef,
  setVolume,
}) => {
  return (
    <div className={s.container}>
      <button
        className={s.volumeIcon}
        onClick={() => setShowVolumeSlider(!showVolumeSlider)}
        ref={volumeButtonRef}
      >
        <FontAwesomeIcon icon={volume === 0 ? faVolumeMute : faVolumeUp} />
      </button>
      {showVolumeSlider && (
        <div
          className={s.sliderPopup}
          style={{ '--volume-value': `${volumePercentage}%` } as React.CSSProperties}
          ref={volumeSliderRef}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className={s.verticalSlider}
          />
        </div>
      )}
    </div>
  );
};
