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
import { ProfileButton } from '../Buttons/ProfileButton';
import { PlaybackControls } from './PlaybackControls/PlaybackControls';
import { VolumeVoiceControls } from './VolumeVoiceControls/VolumeVoiceControls';
import { userData } from '../../../interfaces';
import { setSelectedVoice } from '../../../store/voiceSlice';

export const AudioPlayer = (props: { userData: userData }) => {
  const { userData } = props || {};
  const audioRef = useRef<HTMLAudioElement>(null);
  const dispatch = useDispatch();
  const { selectedVoice, voices } = useSelector((state: RootState) => state.voice);
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
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const mobileVolumeSliderRef = useRef<HTMLDivElement>(null);
  const mobileVolumeButtonRef = useRef<HTMLButtonElement>(null);
  const voiceSelectorRef = useRef<HTMLDivElement>(null);
  const voiceButtonRef = useRef<HTMLButtonElement>(null);
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
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showVoiceSelector &&
        voiceSelectorRef.current &&
        !voiceSelectorRef.current.contains(event.target as Node) &&
        voiceButtonRef.current &&
        !voiceButtonRef.current.contains(event.target as Node)
      ) {
        setShowVoiceSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVoiceSelector]);

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

      <PlaybackControls
        audioRef={audioRef}
        currentTime={currentTime}
        duration={duration}
        progressPercentage={progressPercentage}
        handlePrevious={handlePrevious}
        handleNext={handleNext}
        isPlaying={isPlaying}
        isPrevDisabled={isPrevDisabled}
        isNextDisabled={isNextDisabled}
        currentTrackIndex={currentTrackIndex}
        formatTime={formatTime}
        togglePlayPause={() => dispatch(togglePlayPause())}
        setCurrentTime={(time) => dispatch(setCurrentTime(time))}
      />

      <VolumeVoiceControls
        volume={volume}
        handleVolumeToggle={handleVolumeToggle}
        volumePercentage={volumePercentage}
        isMobile={isMobile}
        showMobileVolumeSlider={showMobileVolumeSlider}
        setShowMobileVolumeSlider={setShowMobileVolumeSlider}
        mobileVolumeSliderRef={mobileVolumeSliderRef}
        mobileVolumeButtonRef={mobileVolumeButtonRef}
        showVoiceSelector={showVoiceSelector}
        setShowVoiceSelector={setShowVoiceSelector}
        voiceSelectorRef={voiceSelectorRef}
        voiceButtonRef={voiceButtonRef}
        selectedVoice={selectedVoice}
        voices={voices}
        setVolume={(vol) => dispatch(setVolume(vol))}
        setSelectedVoice={(voice) => dispatch(setSelectedVoice(voice))}
      />
    </div>
  );
};
