import s from './AudioPlayer.module.css';
import { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../store';
import {
  setVolume,
  setCurrentTime,
  setDuration,
  togglePlayPause,
  playNext as playNextAudio,
  playPrevious as playPreviousAudio,
} from '../../../../store/audioPlayerSlice';
import { setSelectedVoice } from '../../../../store/voiceSlice';
import { goToNextPage, goToPreviousPage } from '../../../../store/pdfReaderSlice';
import { PlaybackControls } from './PlaybackControls/PlaybackControls';
import { VolumeControls } from './VolumeControls/VolumeControls';
import { VoiceSelectorButton } from './VoiceSelectorButton/VoiceSelectorButton';
import { VoiceSelectorModal } from '../../Modals/VoiceSelectorModal';
import { play as playBrowserAudio, stop as stopBrowserAudio } from 'store/browserPlayerSlice';
import { textToSpeechService } from 'services/tts';

export const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const dispatch = useDispatch();
  const credentials = useSelector((state: RootState) => state.credentials.credentials);
  const {
    volume,
    playlist,
    duration,
    isPlaying,
    sourceType,
    currentTime,
    currentTrackIndex,
  } = useSelector((state: RootState) => state.audioPlayer);
  const {
    totalPages,
    currentPage,
    isLoaded: isPdfLoaded,
    pages,
  } = useSelector((state: RootState) => state.pdfReader);

  const [lastVolume, setLastVolume] = useState(volume);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileVolumeSlider, setShowMobileVolumeSlider] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const mobileVolumeSliderRef = useRef<HTMLDivElement>(null);
  const mobileVolumeButtonRef = useRef<HTMLButtonElement>(null);
  const currentTrackUrl = currentTrackIndex !== null ? playlist[currentTrackIndex] : null;
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercentage = volume * 100;

  useEffect(() => {
    const handleVoicesChanged = () => {
      setBrowserVoices(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    handleVoicesChanged();
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, []);

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
    //eslint-disable-next-line
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

  const handleTogglePlayPause = () => {
    if (playlist.length > 0) {
      dispatch(togglePlayPause());
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const isPrevDisabled = isPdfLoaded ? currentPage === 1 : currentTrackIndex === 0;
  const isNextDisabled = isPdfLoaded ? currentPage === totalPages : currentTrackIndex === (playlist.length - 1);

  const aiVoices = credentials?.[0]?.voices?.map(v => ({ value: v.value, label: v.label, gender: v.gender })) || [];
  const mappedBrowserVoices = browserVoices.map(v => ({ value: v.name, label: v.name, gender: 'Unknown', isBrowser: true }));

  const reduxSelectedVoice = useSelector((state: RootState) => state.voice.selectedVoice);

  const handleVoiceSelection = async (selected: { value: string, label: string, gender: string, isBrowser?: boolean }) => {
    setIsVoiceModalOpen(false);
    if (selected.isBrowser) {
      dispatch(setSelectedVoice({ value: selected.value, type: 'browser' }));
      localStorage.setItem('default_browser_voice', JSON.stringify({ value: selected.value, type: 'browser' }));
      if (isPlaying) {
        const text = pages[currentPage];
        if (text) {
          dispatch(stopBrowserAudio());
          dispatch(playBrowserAudio());
        }
      }
    } else {
      dispatch(setSelectedVoice({ value: selected.value, type: 'ia' }));
      if (isPlaying) {
        const text = pages[currentPage];
        if (text) {
          const audioUrl = await textToSpeechService({ text, voice: selected.value });
          dispatch(setCurrentTime(0));
          dispatch(setDuration(0));
          audioRef.current!.src = audioUrl;
          audioRef.current!.play();
        }
      }
    }
  };

  return (
    <>
      <div className={s.audioPlayerContainer}>
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
        <section className={s.leftSection}>
          <VoiceSelectorButton onClick={() => setIsVoiceModalOpen(true)} />
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
          togglePlayPause={handleTogglePlayPause}
          setCurrentTime={(time) => dispatch(setCurrentTime(time))}
        />

        <VolumeControls
          volume={volume}
          handleVolumeToggle={handleVolumeToggle}
          volumePercentage={volumePercentage}
          isMobile={isMobile}
          showMobileVolumeSlider={showMobileVolumeSlider}
          setShowMobileVolumeSlider={setShowMobileVolumeSlider}
          mobileVolumeSliderRef={mobileVolumeSliderRef}
          mobileVolumeButtonRef={mobileVolumeButtonRef}
          setVolume={(vol) => dispatch(setVolume(vol))}
        />
      </div>
      <VoiceSelectorModal
        show={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        aiVoices={aiVoices}
        browserVoices={mappedBrowserVoices}
        setSelectedVoice={handleVoiceSelection}
        reduxSelectedVoice={reduxSelectedVoice}
      />
    </>
  );
};
