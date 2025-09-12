import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeUp, faVolumeMute, faMicrophone, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import s from './VolumeVoiceControls.module.css';

interface VoiceOption {
  value: string;
  name: string;
}

interface VolumeVoiceControlsProps {
  volume: number;
  handleVolumeToggle: () => void;
  volumePercentage: number;
  isMobile: boolean;
  showMobileVolumeSlider: boolean;
  setShowMobileVolumeSlider: (show: boolean) => void;
  mobileVolumeSliderRef: React.RefObject<HTMLDivElement | null>;
  mobileVolumeButtonRef: React.RefObject<HTMLButtonElement | null>;
  showVoiceSelector: boolean;
  setShowVoiceSelector: (show: boolean) => void;
  voiceSelectorRef: React.RefObject<HTMLDivElement | null>;
  voiceButtonRef: React.RefObject<HTMLButtonElement | null>;
  selectedVoice: string;
  voices: VoiceOption[];
  setVolume: (volume: number) => void;
  setSelectedVoice: (voice: string) => void;
}

export const VolumeVoiceControls: React.FC<VolumeVoiceControlsProps> = ({
  volume,
  handleVolumeToggle,
  volumePercentage,
  isMobile,
  showMobileVolumeSlider,
  setShowMobileVolumeSlider,
  mobileVolumeSliderRef,
  mobileVolumeButtonRef,
  showVoiceSelector,
  setShowVoiceSelector,
  voiceSelectorRef,
  voiceButtonRef,
  selectedVoice,
  voices,
  setVolume,
  setSelectedVoice,
}) => {
  return (
    <section>
      {!isMobile ? (
        <div className={s.volumeControlContainer}>
          <div className={s.voiceSelectorContainer}>
            <button
              className={s.voiceButton}
              onClick={() => setShowVoiceSelector(!showVoiceSelector)}
              ref={voiceButtonRef}
            >
              <FontAwesomeIcon icon={faCommentDots} />
            </button>
            {showVoiceSelector && (
              <div className={s.voiceDropdown} ref={voiceSelectorRef}>
                {voices.map((voiceOption) => (
                  <button
                    key={voiceOption.value}
                    className={`${s.voiceOption} ${selectedVoice === voiceOption.value ? s.activeVoice : ''}`}
                    onClick={() => {
                      setSelectedVoice(voiceOption.value);
                      setShowVoiceSelector(false);
                    }}
                  >
                    {voiceOption.name}
                  </button>
                ))}
              </div>
            )}
          </div>
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
          <div className={s.voiceSelectorContainer}>
            <button
              className={s.voiceButton}
              onClick={() => setShowVoiceSelector(!showVoiceSelector)}
              ref={voiceButtonRef}
            >
              <FontAwesomeIcon icon={faMicrophone} />
            </button>
            {showVoiceSelector && (
              <div className={s.voiceDropdown} ref={voiceSelectorRef}>
                {voices.map((voiceOption) => (
                  <button
                    key={voiceOption.value}
                    className={`${s.voiceOption} ${selectedVoice === voiceOption.value ? s.activeVoice : ''}`}
                    onClick={() => {
                      setSelectedVoice(voiceOption.value);
                      setShowVoiceSelector(false);
                    }}
                  >
                    {voiceOption.name}
                  </button>
                ))}
              </div>
            )}
          </div>
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
