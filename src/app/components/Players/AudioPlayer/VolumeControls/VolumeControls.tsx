import s from './VolumeControls.module.css';
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeUp, faVolumeMute, faMicrophone, faMusic } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../../../i18n';

interface VolumeControlsProps {
  volume: number;
  volumePercentage: number;
  showVolumeSlider: boolean;
  setShowVolumeSlider: (show: boolean) => void;
  volumeSliderRef: React.RefObject<HTMLDivElement | null>;
  volumeButtonRef: React.RefObject<HTMLButtonElement | null>;
  setVolume: (volume: number) => void;
  activeSoundBgId?: string | null;
  soundBgVolume?: number;
  setSoundBgVolume?: (v: number) => void;
  masterVolume?: number;
  setMasterVolume?: (v: number) => void;
}

export const VolumeControls: React.FC<VolumeControlsProps> = ({
  volume,
  volumePercentage,
  showVolumeSlider,
  setShowVolumeSlider,
  volumeSliderRef,
  volumeButtonRef,
  setVolume,
  activeSoundBgId,
  soundBgVolume = 0.35,
  setSoundBgVolume,
  masterVolume = 1,
  setMasterVolume,
}) => {
  const { t } = useLanguage();
  const [showMixer, setShowMixer] = useState(false);
  const mixerRef = useRef<HTMLDivElement>(null);
  const hasSoundBg = !!activeSoundBgId;

  useEffect(() => {
    if (!showMixer) return;
    const handle = (e: MouseEvent) => {
      if (mixerRef.current && !mixerRef.current.contains(e.target as Node) &&
          volumeButtonRef.current && !volumeButtonRef.current.contains(e.target as Node)) {
        setShowMixer(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showMixer, volumeButtonRef]);

  const handleVolumeButtonClick = () => {
    if (hasSoundBg) {
      setShowMixer(!showMixer);
      setShowVolumeSlider(false);
    } else {
      setShowVolumeSlider(!showVolumeSlider);
      setShowMixer(false);
    }
  };

  const masterPct = Math.round(masterVolume * 100);
  const voicePct = Math.round(volume * 100);
  const ambientPct = Math.round(soundBgVolume * 100);

  return (
    <div className={s.container}>
      <button
        className={s.volumeIcon}
        onClick={handleVolumeButtonClick}
        ref={volumeButtonRef}
      >
        <FontAwesomeIcon icon={volume === 0 ? faVolumeMute : faVolumeUp} />
      </button>

      {showVolumeSlider && !hasSoundBg && (
        <div
          className={s.sliderPopup}
          style={{ '--volume-value': `${volumePercentage}%` } as React.CSSProperties}
          ref={volumeSliderRef}
        >
          <input
            type="range"
            min="0" max="1" step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className={s.verticalSlider}
          />
        </div>
      )}

      {showMixer && hasSoundBg && (
        <div className={s.mixerPopup} ref={mixerRef}>
          <p className={s.mixerTitle}>{t.player.mixer}</p>
          <div className={s.mixerFaders}>

            <div className={s.mixerFaderCol}>
              <FontAwesomeIcon icon={faVolumeUp} className={s.mixerFaderIcon} />
              <div
                className={s.mixerFaderTrack}
                style={{ '--mixer-pct': `${masterPct}%` } as React.CSSProperties}
              >
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume?.(parseFloat(e.target.value))}
                  className={s.mixerVerticalSlider}
                />
              </div>
              <span className={s.mixerFaderValue}>{masterPct}%</span>
            </div>

            <div className={s.mixerSeparator} />

            <div className={s.mixerFaderCol}>
              <FontAwesomeIcon icon={faMicrophone} className={s.mixerFaderIcon} />
              <div
                className={s.mixerFaderTrack}
                style={{ '--mixer-pct': `${voicePct}%` } as React.CSSProperties}
              >
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className={s.mixerVerticalSlider}
                />
              </div>
              <span className={s.mixerFaderValue}>{voicePct}%</span>
            </div>

            <div className={s.mixerFaderCol}>
              <FontAwesomeIcon icon={faMusic} className={s.mixerFaderIcon} />
              <div
                className={s.mixerFaderTrack}
                style={{ '--mixer-pct': `${ambientPct}%` } as React.CSSProperties}
              >
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={soundBgVolume}
                  onChange={(e) => setSoundBgVolume?.(parseFloat(e.target.value))}
                  className={s.mixerVerticalSlider}
                />
              </div>
              <span className={s.mixerFaderValue}>{ambientPct}%</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
