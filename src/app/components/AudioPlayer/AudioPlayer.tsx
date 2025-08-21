import { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import {
  setVolume,
  setCurrentTime,
  setDuration,
  togglePlayPause,
  playNext as playNextAudio,
  playPrevious as playPreviousAudio,
} from '../../../store/audioPlayerSlice';
import { goToNextPage, goToPreviousPage } from '../../../store/pdfReaderSlice';
import s from './AudioPlayer.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStepBackward, faStepForward, faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import { ProfileButton } from '../Buttons/ProfileButton';
import { userData } from '../../../interfaces';

export const AudioPlayer = (props: { userData: userData }) => {
  const { userData } = props || {};
  const audioRef = useRef<HTMLAudioElement>(null);
  const dispatch = useDispatch();
  const {
    playlist,
    currentTrackIndex,
    isPlaying,
    volume,
    currentTime,
    duration,
    sourceType
  } = useSelector((state: RootState) => state.audioPlayer);
  const {
    currentPage,
    totalPages,
    isLoaded: isPdfLoaded
  } = useSelector((state: RootState) => state.pdfReader);

  const [lastVolume, setLastVolume] = useState(volume);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileVolumeSlider, setShowMobileVolumeSlider] = useState(false);
  const mobileVolumeSliderRef = useRef<HTMLDivElement>(null);
  const mobileVolumeButtonRef = useRef<HTMLButtonElement>(null);
  const currentTrackUrl = currentTrackIndex !== null ? playlist[currentTrackIndex] : null;
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercentage = volume * 100;

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMobileVolumeSlider &&
        mobileVolumeSliderRef.current &&
        !mobileVolumeSliderRef.current.contains(event.target as Node) &&
        mobileVolumeButtonRef.current &&
        !mobileVolumeButtonRef.current.contains(event.target as Node)
      ) {
        setShowMobileVolumeSlider(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileVolumeSlider]);

  useEffect(() => {
    if (audioRef.current) {
      if (currentTrackUrl) {
        audioRef.current.src = currentTrackUrl;
        audioRef.current.load();
        if (isPlaying) {
          audioRef.current.play().catch(e => console.error("Error playing audio:", e));
        }
      } else {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    }
  }, [currentTrackUrl]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current && !isPlaying && currentTime === 0) {
      audioRef.current.currentTime = 0;
    }
  }, [isPlaying, currentTime]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      dispatch(setCurrentTime(audioRef.current.currentTime));
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      dispatch(setDuration(audioRef.current.duration));
    }
  };

  const handleEnded = () => {
    if (sourceType === 'pdfPage') {
      if (currentPage < totalPages) {
        dispatch(goToNextPage());
      }
    } else {
      dispatch(playNextAudio());
    }
  };

  const handlePrevious = () => {
    if (isPdfLoaded) {
      dispatch(goToPreviousPage());
    } else {
      dispatch(playPreviousAudio());
    }
  };

  const handleNext = () => {
    if (isPdfLoaded) {
      dispatch(goToNextPage());
    } else {
      dispatch(playNextAudio());
    }
  };

  const handleVolumeToggle = () => {
    if (volume === 0) {
      dispatch(setVolume(lastVolume === 0 ? 1 : lastVolume));
    } else {
      setLastVolume(volume);
      dispatch(setVolume(0));
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const isPrevDisabled = isPdfLoaded ? currentPage === 1 : currentTrackIndex === 0;
  const isNextDisabled = isPdfLoaded ? currentPage === totalPages : currentTrackIndex === (playlist.length - 1);

  return (
    <div className={s.audioPlayerContainer}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <section className={s.user}>
        <ProfileButton userData={userData} />
      </section>

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
              dispatch(setCurrentTime(parseFloat(e.target.value)));
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
          <button onClick={() => dispatch(togglePlayPause())} disabled={currentTrackIndex === null} className={s.playPauseButton} style={currentTrackIndex === null ? { opacity: '0.5', cursor: 'not-allowed' } : {}}>
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
          </button>
          <button onClick={handleNext} disabled={isNextDisabled} className={s.controlButton}>
            <FontAwesomeIcon icon={faStepForward} />
          </button>
        </div>
      </section>

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
                onChange={(e) => dispatch(setVolume(parseFloat(e.target.value)))}>
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
                  onChange={(e) => dispatch(setVolume(parseFloat(e.target.value)))}
                  className={s.verticalSlider}>
                </input>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
