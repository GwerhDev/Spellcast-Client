import { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import {
  setVolume,
  setCurrentTime,
  setDuration,
  togglePlayPause,
  playNext,
  playPrevious,
} from '../../../store/audioPlayerSlice';
import s from './AudioPlayer.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStepBackward, faStepForward, faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import { ProfileButton } from '../Buttons/ProfileButton';
import { userData } from '../../../interfaces';

export const AudioPlayer = (props: { userData: userData }) => {
  const { userData } = props || {};
  const audioRef = useRef<HTMLAudioElement>(null);
  const dispatch = useDispatch();
  const { playlist, currentTrackIndex, isPlaying, volume, currentTime, duration } = useSelector(
    (state: RootState) => state.audioPlayer
  );
  const [lastVolume, setLastVolume] = useState(volume); // State to store the last non-zero volume
  const currentTrackUrl = currentTrackIndex !== null ? playlist[currentTrackIndex] : null;
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercentage = volume * 100;

  useEffect(() => {
    if (audioRef.current) {
      if (currentTrackUrl) {
        audioRef.current.src = currentTrackUrl;
        audioRef.current.load(); // Load the new track
        if (isPlaying) {
          audioRef.current.play().catch(e => console.error("Error playing audio:", e));
        } else {
          audioRef.current.pause();
        }
      } else {
        audioRef.current.pause();
        audioRef.current.src = ''; // Clear the source
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

  // Effect to handle stop functionality: reset current time when stopped
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
    dispatch(playNext());
  };

  const handleVolumeToggle = () => {
    if (volume === 0) {
      dispatch(setVolume(lastVolume === 0 ? 1 : lastVolume)); // If lastVolume was also 0, set to 1
    } else {
      setLastVolume(volume); // Save current volume before muting
      dispatch(setVolume(0));
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

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

      <section>
        <div className={s.progressBarContainer}> {/* New container for progress bar */}
          <input
            type="range"
            min="0"
            max={duration} // Max should be duration for progress
            step="0.01"
            value={currentTime} // Value should be currentTime
            onChange={(e) => {
              if (audioRef.current) {
                audioRef.current.currentTime = parseFloat(e.target.value);
              }
              dispatch(setCurrentTime(parseFloat(e.target.value)));
            }}
            className={s.progressBar} // Apply specific class for progress bar
            style={{ '--progress-value': `${progressPercentage}%` } as React.CSSProperties} // Set CSS variable
          />
          <div className={s.timeDisplay}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className={s.controls}>
          <button onClick={() => dispatch(playPrevious())} disabled={currentTrackIndex === 0} className={s.controlButton}>
            <FontAwesomeIcon icon={faStepBackward} />
          </button>
          <button onClick={() => dispatch(togglePlayPause())} disabled={currentTrackIndex === null} className={s.playPauseButton} style={currentTrackIndex === null ? { opacity: '0.5', cursor: 'not-allowed' } : {}}>
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
          </button>
          <button onClick={() => dispatch(playNext())} disabled={currentTrackIndex === playlist.length - 1} className={s.controlButton}>
            <FontAwesomeIcon icon={faStepForward} />
          </button>
        </div>
      </section>

      <section>
        <div className={s.volumeControlContainer}>
          <button className={s.volumeIcon} onClick={handleVolumeToggle}>
            <FontAwesomeIcon icon={volume === 0 ? faVolumeMute : faVolumeUp} />
          </button>
          <div className={s.volumeSliderWrapper} style={{ '--volume-value': `${volumePercentage}%` } as React.CSSProperties}> {/* Wrapper for the vertical slider */}
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
      </section>
    </div>
  );
};


