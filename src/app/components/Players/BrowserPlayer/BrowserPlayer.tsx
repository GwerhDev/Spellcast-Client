import s from './BrowserPlayer.module.css';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../store';
import {
  stop,
  setVoice as setBrowserVoice,
  setVolume,
  setCurrentSentenceIndex,
  play,
} from '../../../../store/browserPlayerSlice';

import { setSelectedVoice } from '../../../../store/voiceSlice';
import {
  goToNextPage,
  goToPreviousPage,
  setShowPageSelector,
} from '../../../../store/pdfReaderSlice';
import { PlaybackControls } from './PlaybackControls/PlaybackControls';
import { VolumeControls } from './VolumeControls/VolumeControls';
import { VoiceSelectorButton } from './VoiceSelectorButton/VoiceSelectorButton';
import { VoiceSelectorModal } from '../../Modals/VoiceSelectorModal';
import { useNavigate } from 'react-router-dom';

export const BrowserPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    voice,
    volume,
    isPlaying,
    sentences,
    currentSentenceIndex,
  } = useSelector((state: RootState) => state.browserPlayer);
  const credentials = useSelector((state: RootState) => state.credentials.credentials);
  const {
    isLoaded,
    totalPages,
    currentPage,
    documentId,
    documentTitle,
  } = useSelector((state: RootState) => state.pdfReader);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [lastVolume, setLastVolume] = useState(volume);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showMobileVolumeSlider, setShowMobileVolumeSlider] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const mobileVolumeSliderRef = useRef<HTMLDivElement>(null);
  const mobileVolumeButtonRef = useRef<HTMLButtonElement>(null);
  const volumePercentage = volume * 100;

  const handleTitle = () => {
    navigate(`/document/local/${documentId}`);
  };

  const handlePageSelector = () => {
    dispatch(setShowPageSelector(true));
  };

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileVolumeSlider]);

  const reduxSelectedVoice = useSelector((state: RootState) => state.voice.selectedVoice);

  const speak = useCallback((sentenceIndex: number) => {
    if (sentenceIndex > sentences.length && currentPage < totalPages) {
      handleNext()
      dispatch(setCurrentSentenceIndex(0));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[sentenceIndex]);
    if (voice) utterance.voice = voice;
    utterance.volume = volume;
    utterance.onend = () => {
      // Check if it was cancelled before proceeding
      speak(sentenceIndex + 1);
    };

    window.speechSynthesis.speak(utterance);
    handlePlay();
    dispatch(setCurrentSentenceIndex(sentenceIndex));
    //eslint-disable-next-line
  }, [sentences, voice, volume, dispatch, currentPage, totalPages]);

  useEffect(() => {
    // This effect triggers the start of sentence-based playback once sentences are set
    if (isLoaded) {
      handleStop();
      speak(currentSentenceIndex);
    }

    //eslint-disable-next-line 
  }, [currentSentenceIndex, speak, isLoaded]);

  useEffect(() => {
    const handleVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      if (reduxSelectedVoice.type === 'browser') {
        const storedBrowserVoice = voices.find(v => v.name === reduxSelectedVoice.value);
        if (storedBrowserVoice) {
          dispatch(setBrowserVoice(storedBrowserVoice));
        } else if (voices.length > 0) {
          // Fallback to default browser voice if stored one is not found
          const defaultVoice = voices.find(v => v.default);
          dispatch(setBrowserVoice(defaultVoice || voices[0]));
          // Also update Redux state to reflect the actual voice being used
          dispatch(setSelectedVoice({ value: (defaultVoice || voices[0]).name, type: 'browser' }));
        }
      } else if (!voice && voices.length > 0) {
        // If an AI voice is selected in Redux, but no browser voice is set yet (e.g., initial load)
        // Set a default browser voice for potential fallback or switching
        const defaultVoice = voices.find(v => v.default);
        dispatch(setBrowserVoice(defaultVoice || voices[0]));
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    handleVoicesChanged();
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      handleStop();
    };
    //eslint-disable-next-line
  }, [dispatch, voice, reduxSelectedVoice]);

  const handleStop = () => {
    dispatch(stop());
    window.speechSynthesis.cancel();
  };

  const handlePlay = () => {
    if (isLoaded) {
      dispatch(play());
      window.speechSynthesis.resume();
    }
  };

  const handlePrevious = () => {
    if (isLoaded) {
      handleStop();
      dispatch(goToPreviousPage());
    }
  };

  const handleNext = () => {
    if (isLoaded) {
      handleStop();
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

  const isPrevDisabled = isLoaded ? currentPage === 1 : true;
  const isNextDisabled = isLoaded ? currentPage === totalPages : true;

  const aiVoices = credentials?.[0]?.voices?.map(v => ({ value: v.value, label: v.label, gender: v.gender })) || [];
  const mappedBrowserVoices = availableVoices.map(v => ({ value: v.name, label: v.name, gender: 'Unknown', isBrowser: true }));

  const handleVoiceSelection = async (selected: { value: string, label: string, gender: string, isBrowser?: boolean }) => {
    setIsVoiceModalOpen(false);
    if (selected.isBrowser) {
      const newVoice = availableVoices.find(v => v.name === selected.value);
      if (newVoice) {
        dispatch(setBrowserVoice(newVoice));
        dispatch(setSelectedVoice({ value: selected.value, type: 'browser' }));
        localStorage.setItem('default_browser_voice', JSON.stringify({ value: selected.value, type: 'browser' }));
      }
    }
  };

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

  return (
    <>
      <div className={s.audioPlayerContainer}>
        <section className={s.leftSection}>
          <VoiceSelectorButton onClick={() => setIsVoiceModalOpen(true)} />
          {
            isLoaded &&
            <div className={s.documentDetails}>
              <p title={documentTitle || ""} onClick={handleTitle}>{documentTitle}</p>
              <small onClick={handlePageSelector}>Page {currentPage} of {totalPages}</small>
            </div>
          }
        </section>

        <PlaybackControls
          disabled={!isLoaded}
          handlePrevious={handlePrevious}
          handleNext={handleNext}
          isPrevDisabled={isPrevDisabled}
          isNextDisabled={isNextDisabled}
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

