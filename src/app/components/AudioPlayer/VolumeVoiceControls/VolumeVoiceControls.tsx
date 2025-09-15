import s from './VolumeVoiceControls.module.css';
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeUp, faVolumeMute, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { VoiceSelectorModal } from '../../Modals/VoiceSelectorModal';

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
  selectedVoice,
  voices,
  setVolume,
  setSelectedVoice,
}) => {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  return (
    <>
      <section>
        {!isMobile ? (
          <div className={s.volumeControlContainer}>
            <div className={s.voiceSelectorContainer}>
              <button
                className={s.voiceButton}
                onClick={() => setIsVoiceModalOpen(true)}
              >
                <FontAwesomeIcon icon={faCommentDots} />
              </button>
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
                onClick={() => setIsVoiceModalOpen(true)}
              >
                <FontAwesomeIcon icon={faCommentDots} />
              </button>
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
      <VoiceSelectorModal
        show={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        voices={voices}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
      />
    </>
  );
};
