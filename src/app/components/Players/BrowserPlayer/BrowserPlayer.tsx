import s from './BrowserPlayer.module.css';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../store';
import {
  play,
  pause,
  resume,
  stop,
  setVoice as setBrowserVoice,
} from '../../../../store/browserPlayerSlice';
import {
  setVolume,
  setPlaylist,
  play as playAiAudio,
} from '../../../../store/audioPlayerSlice';
import { setSelectedVoice } from '../../../../store/voiceSlice';
import { goToNextPage, goToPreviousPage } from '../../../../store/pdfReaderSlice';
import { PlaybackControls } from './PlaybackControls/PlaybackControls';
import { VolumeControls } from './VolumeControls/VolumeControls';
import { VoiceSelectorButton } from './VoiceSelectorButton/VoiceSelectorButton';
import { VoiceSelectorModal } from '../../Modals/VoiceSelectorModal';
import { textToSpeechService } from 'services/tts';

export const BrowserPlayer = () => {
  const dispatch = useDispatch();
  const { text, isPlaying, isPaused, voice } = useSelector((state: RootState) => state.browserPlayer);
  const { volume } = useSelector((state: RootState) => state.audioPlayer);
  const credentials = useSelector((state: RootState) => state.credentials.credentials);
  const {
    totalPages,
    currentPage,
    isLoaded: isPdfLoaded
  } = useSelector((state: RootState) => state.pdfReader);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [lastVolume, setLastVolume] = useState(volume);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showMobileVolumeSlider, setShowMobileVolumeSlider] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const mobileVolumeSliderRef = useRef<HTMLDivElement>(null);
  const mobileVolumeButtonRef = useRef<HTMLButtonElement>(null);
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
    const handleVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (!voice && voices.length > 0) {
        const defaultVoice = voices.find(v => v.default);
        dispatch(setBrowserVoice(defaultVoice || voices[0]));
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    handleVoicesChanged();

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, [dispatch, voice]);

  const handlePlay = useCallback(() => {
    if (text) {
      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.volume = volume;
      utterance.onend = () => {
        dispatch(stop());
        if (currentPage < totalPages) {
          dispatch(goToNextPage());
        }
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      dispatch(play());
    }
  }, [text, voice, volume, dispatch, currentPage, totalPages]);

  const handlePause = () => {
    window.speechSynthesis.pause();
    dispatch(pause());
  };

  const handleResume = () => {
    window.speechSynthesis.resume();
    dispatch(resume());
  };

  useEffect(() => {
    if (isPlaying && !isPaused) {
      handlePlay();
    }
  }, [isPlaying, isPaused, handlePlay]);

  const handlePrevious = () => {
    if (isPdfLoaded) {
      dispatch(goToPreviousPage());
    }
  };

  const handleNext = () => {
    if (isPdfLoaded) {
      dispatch(goToNextPage());
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

  const togglePlayPause = () => {
    if (isPlaying) {
      if (isPaused) {
        handleResume();
      } else {
        handlePause();
      }
    } else {
      handlePlay();
    }
  };

  const isPrevDisabled = isPdfLoaded ? currentPage === 1 : true;
  const isNextDisabled = isPdfLoaded ? currentPage === totalPages : true;

  const aiVoices = credentials?.[0]?.voices?.map(v => ({ voice_id: v.value, name: v.label })) || [];
  const mappedBrowserVoices = availableVoices.map(v => ({ voice_id: v.name, name: v.name, isBrowser: true }));

  const handleVoiceSelection = async (selected: { voice_id: string, name: string, isBrowser?: boolean }) => {
    setIsVoiceModalOpen(false);
    if (selected.isBrowser) {
      const newVoice = availableVoices.find(v => v.name === selected.voice_id);
      if (newVoice) {
        dispatch(setBrowserVoice(newVoice));
        // If we were playing something, replay it with the new voice
        if (isPlaying) {
          handlePlay();
        }
      }
    } else {
      // Switch to AI voice
      dispatch(setSelectedVoice(selected.voice_id));
      // If we were playing something with browser, we need to stop it and start with AI
      if (text) {
        window.speechSynthesis.cancel();
        dispatch(stop());
        const audioUrl = await textToSpeechService({ text, voice: selected.voice_id });
        dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0 }));
        dispatch(playAiAudio());
      }
    }
  };

  const currentSelectedVoice = voice ? { voice_id: voice.name, name: voice.name, isBrowser: true } : null;

  return (
    <>
      <div className={s.audioPlayerContainer}>
        <section className={s.leftSection}>
          <VoiceSelectorButton onClick={() => setIsVoiceModalOpen(true)} />
        </section>

        <PlaybackControls
          handlePrevious={handlePrevious}
          handleNext={handleNext}
          isPlaying={isPlaying && !isPaused}
          isPrevDisabled={isPrevDisabled}
          isNextDisabled={isNextDisabled}
          togglePlayPause={togglePlayPause}
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
        selectedVoice={currentSelectedVoice}
        setSelectedVoice={handleVoiceSelection}
      />
    </>
  );
};