
import s from './VolumeControls.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';

interface VolumeControlsProps {
  volume: number;
  handleVolumeToggle: () => void;
  volumePercentage: number;
  isMobile: boolean;
  showMobileVolumeSlider: boolean;
  setShowMobileVolumeSlider: (show: boolean) => void;
  mobileVolumeSliderRef: React.RefObject<HTMLDivElement | null>;
  mobileVolumeButtonRef: React.RefObject<HTMLButtonElement | null>;
  setVolume: (volume: number) => void;
}

export const VolumeControls: React.FC<VolumeControlsProps> = ({
  volume,
  handleVolumeToggle,
  volumePercentage,
  isMobile,
  showMobileVolumeSlider,
  setShowMobileVolumeSlider,
  mobileVolumeSliderRef,
  mobileVolumeButtonRef,
  setVolume,
}) => {
  return (
    <section>
      {!isMobile ? (
        <div className={s.volumeControlContainer}>
          <button className={s.volumeIcon} onClick={handleVolumeToggle}>
            <FontAwesomeIcon icon={volume === 0 ? faVolumeMute : faVolumeUp} />
          </button>
          <div className={s.volumeSliderWrapper} style={{ '--volume-value': `${volumePercentage}%` } as React.CSSProperties}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}>
            </input>
          </div>
        </div>
      ) : (
        <div className={s.mobileVolumeControlContainer}>
          <button className={s.volumeIcon} onClick={() => setShowMobileVolumeSlider(!showMobileVolumeSlider)} ref={mobileVolumeButtonRef}>
            <FontAwesomeIcon icon={volume === 0 ? faVolumeMute : faVolumeUp} />
          </button>
          {showMobileVolumeSlider && (
            <div className={s.mobileVolumeSliderWrapper} style={{ '--volume-value': `${volumePercentage}%` } as React.CSSProperties} ref={mobileVolumeSliderRef}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className={s.verticalSlider}>
              </input>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
